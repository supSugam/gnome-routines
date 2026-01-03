import { BaseTrigger } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import { TriggerType, SystemTriggerConfig, TriggerStrategy } from '../types.js';
import debugLog from '../../utils/log.js';

export class SystemTrigger extends BaseTrigger {
  private adapter: SystemAdapter;
  public _isActivated: boolean = false;

  constructor(id: string, config: SystemTriggerConfig, adapter: SystemAdapter) {
    super(id, config.type, config);
    this.adapter = adapter;
  }

  async check(): Promise<boolean> {
    switch (this.type) {
      case TriggerType.POWER_SAVER: {
        // For power profiles, compare the actual profile string
        const currentProfile = await this.adapter.getPowerProfile();
        const targetProfile = this.config.profile || 'power-saver';
        debugLog(
          `[SystemTrigger] Checking power profile. Current: ${currentProfile}, Target: ${targetProfile}`
        );
        return currentProfile === targetProfile;
      }
      case TriggerType.AIRPLANE_MODE: {
        const currentState = await this.adapter.getAirplaneModeState();
        const targetState =
          this.config.state === 'on' || this.config.state === 'connected';
        debugLog(
          `[SystemTrigger] Checking ${this.type}. Current: ${currentState}, Target: ${targetState}`
        );
        return currentState === targetState;
      }
      case TriggerType.HEADPHONES: {
        const currentState = await this.adapter.getWiredHeadphonesState();
        const targetState =
          this.config.state === 'on' || this.config.state === 'connected';
        debugLog(
          `[SystemTrigger] Checking ${this.type}. Current: ${currentState}, Target: ${targetState}`
        );
        return currentState === targetState;
      }
    }
    return false;
  }

  private _lastMatch: boolean | null = null;
  private cleanup: (() => void) | null = null;

  activate(): void {
    debugLog(`[SystemTrigger] Activating listener for ${this.type}`);
    this._isActivated = true;

    // Initialize state
    // Initialize state
    this.check().then((initialState) => {
      if (this._lastMatch === null) {
        const shouldIgnoreInitial =
          this.strategy === TriggerStrategy.NEW_CHANGE_ONLY;
        if (shouldIgnoreInitial) {
          debugLog(
            `[SystemTrigger] Setting initial state for ${this.type}: ${initialState} (Ignored)`
          );
          this._lastMatch = initialState;
        } else {
          debugLog(
            `[SystemTrigger] Setting initial state for ${this.type}: ${initialState} (Checking immediate)`
          );
          this._lastMatch = initialState;
          if (initialState) {
            this.emit('triggered');
          }
        }
      }
    });

    const callback = async (state: boolean) => {
      // We need to re-evaluate the full condition because "state" arg might just be the raw value
      // but check() compares it to target.
      // Actually the callback args vary by adapter method.
      // But simply calling check() is safest to get "Matched or Not".
      const isMatch = await this.check();

      if (this._lastMatch === null) {
        const shouldIgnoreInitial =
          this.strategy === TriggerStrategy.NEW_CHANGE_ONLY;
        if (shouldIgnoreInitial) {
          debugLog(
            `[SystemTrigger] ${this.type} Initial Race: ${isMatch} (Ignored)`
          );
          this._lastMatch = isMatch;
          return;
        } else {
          debugLog(
            `[SystemTrigger] ${this.type} Initial Race: ${isMatch} (Checking immediate)`
          );
          this._lastMatch = isMatch;
          if (isMatch) {
            this.emit('triggered');
          }
          return;
        }
      }

      if (isMatch !== this._lastMatch) {
        debugLog(
          `[SystemTrigger] ${this.type} state changed: ${this._lastMatch} -> ${isMatch}`
        );
        this._lastMatch = isMatch;
        if (isMatch) {
          debugLog(
            `[SystemTrigger] Condition met (TRUE). Emitting 'triggered'.`
          );
          this.emit('triggered');
        } else {
          debugLog(`[SystemTrigger] Condition lost (FALSE). Not emitting.`);
        }
      }
    };

    switch (this.type) {
      case TriggerType.POWER_SAVER:
        this.cleanup = this.adapter.onPowerSaverStateChanged((isActive) =>
          callback(isActive)
        );
        break;
      case TriggerType.AIRPLANE_MODE:
        this.cleanup = this.adapter.onAirplaneModeStateChanged((isEnabled) =>
          callback(isEnabled)
        );
        break;
      case TriggerType.HEADPHONES:
        this.cleanup = this.adapter.onWiredHeadphonesStateChanged(
          (isConnected) => callback(isConnected)
        );
        break;
    }
  }

  deactivate(): void {
    if (!this._isActivated) return;
    this._isActivated = false;
    this._lastMatch = null;
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
  }
}
