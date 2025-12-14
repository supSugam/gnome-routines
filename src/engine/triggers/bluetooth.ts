import { BaseTrigger } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import { ConnectionState, TriggerType, TriggerStrategy } from '../types.js';
import debugLog from '../../utils/log.js';

export class BluetoothTrigger extends BaseTrigger {
  private adapter: SystemAdapter;
  public _isActivated: boolean = false;
  private _lastMatchState: boolean | null = null;

  constructor(
    id: string,
    config: {
      state: ConnectionState;
      deviceIds?: string[];
    },
    adapter: SystemAdapter
  ) {
    super(id, TriggerType.BLUETOOTH, config);
    this.adapter = adapter;
  }

  async check(): Promise<boolean> {
    return this._evaluateCondition();
  }

  private async _evaluateCondition(): Promise<boolean> {
    try {
      // Power state check
      if (
        this.config.state === ConnectionState.ENABLED ||
        this.config.state === ConnectionState.DISABLED
      ) {
        const isEnabled = await this.adapter.getBluetoothPowerState();
        return this.config.state === ConnectionState.ENABLED
          ? isEnabled
          : !isEnabled;
      }

      // Connection state check
      const connectedDevices =
        await this.adapter.getConnectedBluetoothDevices();

      // If specific devices are configured
      if (this.config.deviceIds && this.config.deviceIds.length > 0) {
        const isMatch = connectedDevices.some(
          (d) =>
            this.config.deviceIds!.includes(d.name) ||
            this.config.deviceIds!.includes(d.address)
        );

        if (this.config.state === ConnectionState.CONNECTED) {
          return isMatch;
        } else {
          return !isMatch;
        }
      }

      // Default behavior (any device)
      const isAnyConnected = connectedDevices.length > 0;
      if (this.config.state === ConnectionState.CONNECTED) {
        return isAnyConnected;
      } else {
        return !isAnyConnected;
      }
    } catch (e) {
      debugLog(`[BluetoothTrigger] Error checking condition: ${e}`);
      return false;
    }
  }

  private _initialized: boolean = false;
  private cleanup: (() => void) | null = null;

  activate(): void {
    debugLog(`[BluetoothTrigger] Activating listener for ${this.config.state}`);
    this._isActivated = true;
    this._initialized = false;
    this._lastMatchState = null;

    // Initialize baseline state
    // Initialize baseline state
    this._evaluateCondition().then((initialState) => {
      if (!this._initialized) {
        const shouldIgnoreInitial =
          this.strategy === TriggerStrategy.NEW_CHANGE_ONLY;

        if (shouldIgnoreInitial) {
          debugLog(
            `[BluetoothTrigger] Initial State established: ${initialState} (Baselined - Ignored by Strategy)`
          );
          this._lastMatchState = initialState;
          this._initialized = true;
        } else {
          // STATE_PERSISTENT
          debugLog(
            `[BluetoothTrigger] Initial State established: ${initialState} (Checking immediate)`
          );
          this._lastMatchState = initialState;
          this._initialized = true;

          if (initialState) {
            this.emit('triggered');
          }
        }
      }
    });

    if (
      this.config.state === ConnectionState.ENABLED ||
      this.config.state === ConnectionState.DISABLED
    ) {
      this.cleanup = this.adapter.onBluetoothPowerStateChanged(() => {
        this._handleStateChange();
      });
    } else {
      this.cleanup = this.adapter.onBluetoothDeviceStateChanged(() => {
        this._handleStateChange();
      });
    }
  }

  private async _handleStateChange() {
    if (!this._isActivated) return;

    if (!this._initialized) {
      // Race condition: Event before first evaluation finished.
      // We accept this as the baseline.
      const currentState = await this._evaluateCondition();
      if (!this._initialized) {
        const shouldIgnoreInitial =
          this.strategy === TriggerStrategy.NEW_CHANGE_ONLY;
        if (shouldIgnoreInitial) {
          debugLog(
            `[BluetoothTrigger] Initial State established via Event: ${currentState} (Baselined - Ignored)`
          );
          this._lastMatchState = currentState;
          this._initialized = true;
          return;
        } else {
          debugLog(
            `[BluetoothTrigger] Initial State established via Event: ${currentState} (Checking immediate)`
          );
          this._lastMatchState = currentState;
          this._initialized = true;
          // Proceed to check below
        }
      }
    }

    const currentMatch = await this._evaluateCondition();

    if (currentMatch !== this._lastMatchState) {
      debugLog(
        `[GR-DEBUG] [BluetoothTrigger] State transition DETECTED: ${this._lastMatchState} -> ${currentMatch}`
      );
      this._lastMatchState = currentMatch;

      if (currentMatch) {
        // MATCH became TRUE

        // USER REQUIREMENT: Disconnect is only valid if Power is ON.
        if (this.config.state === ConnectionState.DISCONNECTED) {
          const isPowerOn = await this.adapter.getBluetoothPowerState();
          if (!isPowerOn) {
            debugLog(
              `[BluetoothTrigger] Ignored Disconnect event because Bluetooth Power is OFF.`
            );
            // We suppress the emission for this specific edge case.
            // Logic: The condition IS true (disconnected), but we don't want to act on it.
            // But we already updated _lastMatchState to true.
            // So if we don't emit, RoutineManager won't activate.
            // If we later connect (False), we will emit (False).
            return;
          }
        }

        debugLog(
          `[BluetoothTrigger] Condition met (TRUE). Emitting 'triggered'.`
        );
      } else {
        // MATCH became FALSE
        debugLog(
          `[BluetoothTrigger] Condition lost (FALSE). Emitting 'triggered'.`
        );
      }

      this.emit('triggered');
    }
  }

  deactivate(): void {
    this._isActivated = false;
    this._lastMatchState = null;
    this._initialized = false;

    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }

    debugLog(`[BluetoothTrigger] Deactivated`);
  }
}
