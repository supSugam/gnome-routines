import { BaseTrigger } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import { ConnectionState, TriggerType, TriggerStrategy } from '../types.js';
import debugLog from '../../utils/log.js';

export class WifiTrigger extends BaseTrigger {
  private adapter: SystemAdapter;
  public _isActivated: boolean = false;
  private _initialized: boolean = false;
  private cleanup: (() => void) | null = null;

  constructor(
    id: string,
    config: { state: ConnectionState; ssids?: string[] },
    adapter: SystemAdapter
  ) {
    super(id, TriggerType.WIFI, config);
    this.adapter = adapter;
  }

  async check(): Promise<boolean> {
    // Power state check
    if (
      this.config.state === ConnectionState.ENABLED ||
      this.config.state === ConnectionState.DISABLED
    ) {
      const isEnabled = this.adapter.getWifiPowerState();
      debugLog(
        `[WifiTrigger] Checking power state. Current: ${isEnabled}, Target: ${this.config.state}`
      );
      return this.config.state === ConnectionState.ENABLED
        ? isEnabled
        : !isEnabled;
    }

    // Connection state check
    const isConnected = this.adapter.getWifiState();
    const currentSSID = this.adapter.getCurrentWifiSSID();

    debugLog(
      `[WifiTrigger] Checking connection state. Current: ${isConnected} (${currentSSID}), Target: ${this.config.state}`
    );

    // If specific networks are configured
    if (this.config.ssids && this.config.ssids.length > 0) {
      if (this.config.state === ConnectionState.CONNECTED) {
        // Must be connected AND to one of the allowed SSIDs
        return (
          isConnected &&
          currentSSID !== null &&
          this.config.ssids.includes(currentSSID)
        );
      } else {
        // Disconnected logic with specific networks
        // "Disconnected FROM X" check.
        // If we are currently disconnected, we satisfy "Disconnected from X".
        // If we are currently connected to Y (and Y is not X), we strictly allow "Disconnected from X".
        // If we are connected to X, we are NOT disconnected from X.
        return currentSSID === null || !this.config.ssids.includes(currentSSID);
      }
    }

    // Default behavior (any network)
    if (this.config.state === ConnectionState.CONNECTED) {
      return isConnected;
    } else {
      return !isConnected;
    }
  }

  private _lastState: boolean | null = null;

  activate(): void {
    debugLog(`[WifiTrigger] Activating listener for ${this.config.state}`);
    try {
      this._initialized = false;
      this._lastState = null;

      // Initialize baseline state immediately
      if (
        this.config.state === ConnectionState.ENABLED ||
        this.config.state === ConnectionState.DISABLED
      ) {
        // Power Baseline
        this._lastState = this.adapter.getWifiPowerState();
        debugLog(
          `[WifiTrigger] Got initial power state: ${this._lastState}, strategy: ${this.strategy}`
        );

        const shouldIgnoreInitial =
          this.strategy === TriggerStrategy.NEW_CHANGE_ONLY;

        if (shouldIgnoreInitial) {
          debugLog(
            `[WifiTrigger] Initial Power State: ${this._lastState} (Baselined - Ignored)`
          );
        } else {
          debugLog(
            `[WifiTrigger] Initial Power State: ${this._lastState} (Checking immediate)`
          );
          // Check immediate trigger for persistent
          if (
            this.config.state === ConnectionState.ENABLED &&
            this._lastState
          ) {
            this.emit('triggered');
          } else if (
            this.config.state === ConnectionState.DISABLED &&
            !this._lastState
          ) {
            this.emit('triggered');
          }
        }
        this._initialized = true;

        this.cleanup = this.adapter.onWifiPowerStateChanged(
          (isEnabled: boolean) => {
            debugLog(
              `[WifiTrigger] Power callback received: ${isEnabled}, _initialized: ${this._initialized}, _lastState: ${this._lastState}`
            );
            if (!this._initialized) return;

            if (this._lastState === isEnabled) {
              // Duplicate event / No change
              return;
            }
            this._lastState = isEnabled;
            debugLog(
              `[WifiTrigger] Wifi power changed: ${!isEnabled} -> ${isEnabled}`
            );

            if (this.config.state === ConnectionState.ENABLED && isEnabled) {
              this.emit('triggered');
            } else if (
              this.config.state === ConnectionState.DISABLED &&
              !isEnabled
            ) {
              this.emit('triggered');
            }
          }
        );
      } else {
        // Connection Baseline
        // Connection Baseline
        this._lastState = this.adapter.getWifiState();
        const shouldIgnoreInitial =
          this.strategy === TriggerStrategy.NEW_CHANGE_ONLY;

        if (shouldIgnoreInitial) {
          debugLog(
            `[WifiTrigger] Initial Connection State: ${this._lastState} (Baselined - Ignored)`
          );
        } else {
          debugLog(
            `[WifiTrigger] Initial Connection State: ${this._lastState} (Checking immediate)`
          );
          // Check immediate trigger
          // Note: Logic is complex for SSIDs, we can reuse onWifiStateChanged callback or duplicate check.
          // Reusing callback is tricky because it expects a change.
          // Let's explicitly check here if not ignoring.

          if (
            this.config.state === ConnectionState.CONNECTED &&
            this._lastState
          ) {
            const currentSSID = this.adapter.getCurrentWifiSSID();
            // Always emit on state change so manager can re-evaluate
            this.emit('triggered');
          }
        }

        this._initialized = true;

        this.cleanup = this.adapter.onWifiStateChanged(
          (isConnected: boolean) => {
            if (!this._initialized) return;

            if (this._lastState === isConnected) {
              // Duplicate event / No change
              return;
            }
            this._lastState = isConnected;
            debugLog(
              `[WifiTrigger] Wifi connection changed: ${!isConnected} -> ${isConnected}`
            );

            // Handle specific logic
            if (this.config.state === ConnectionState.CONNECTED) {
              if (isConnected) {
                // ... (Logic for specific SSIDs remains same - triggered check)
                const currentSSID = this.adapter.getCurrentWifiSSID();
                if (this.config.ssids && this.config.ssids.length > 0) {
                  if (currentSSID && this.config.ssids.includes(currentSSID)) {
                    this.emit('triggered');
                  }
                } else {
                  this.emit('triggered');
                }
              }
            } else if (this.config.state === ConnectionState.DISCONNECTED) {
              if (!isConnected) {
                // USER REQUIREMENT: Turning off Wifi is NOT a disconnect event.
                const isPowerOn = this.adapter.getWifiPowerState();
                if (!isPowerOn) {
                  debugLog(
                    `[WifiTrigger] Ignored Disconnect event because Wi-Fi Power is OFF.`
                  );
                  return;
                }

                // Proceed as normal disconnect
                if (!this.config.ssids || this.config.ssids.length === 0) {
                  this.emit('triggered');
                } else {
                  this.emit('triggered'); // Assuming valid disconnect from specific (limitation noted)
                }
              }
            }
          }
        );
      }

      this._isActivated = true;
    } catch (e: any) {
      debugLog(
        `[WifiTrigger] Error during activation: ${
          e?.message || e?.toString() || JSON.stringify(e)
        }`
      );
      throw e;
    }
  }

  deactivate(): void {
    if (!this._isActivated) return;
    debugLog(`[WifiTrigger] Deactivating listener`);
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
    this._isActivated = false;
  }
}
