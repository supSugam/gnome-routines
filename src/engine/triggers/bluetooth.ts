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
    super(id, TriggerType.BLUETOOTH, config, TriggerStrategy.INITIAL_IGNORE);
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

  private cleanup: (() => void) | null = null;

  activate(): void {
    if (this._isActivated) return;

    debugLog(`[BluetoothTrigger] Activating listener for ${this.config.state}`);
    this._isActivated = true;

    // Initialize state asynchronously - this establishes the baseline
    // so we don't trigger on pre-existing state
    this._evaluateCondition().then((initialState) => {
      if (this._lastMatchState === null) {
        debugLog(
          `[BluetoothTrigger] Setting initial state to: ${initialState}`
        );
        this._lastMatchState = initialState;
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

    const currentMatch = await this._evaluateCondition();

    // If this is the first time we see state (and init hasn't finished),
    // set it as baseline and don't trigger.
    if (this._lastMatchState === null) {
      debugLog(
        `[BluetoothTrigger] Initializing state from event: ${currentMatch}`
      );
      this._lastMatchState = currentMatch;
      return;
    }

    if (currentMatch !== this._lastMatchState) {
      debugLog(
        `[BluetoothTrigger] State transition: ${this._lastMatchState} -> ${currentMatch}`
      );
      this._lastMatchState = currentMatch;

      // Only trigger if the condition effectively became true
      if (currentMatch) {
        this.emit('triggered');
      }
    }
  }

  deactivate(): void {
    this._isActivated = false;
    this._lastMatchState = null; // Reset state on deactivate

    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }

    debugLog(`[BluetoothTrigger] Deactivated`);
  }
}
