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
    debugLog(
      `[SystemTrigger] Constructed ${id} type=${config.type} strategy=${this.strategy}`
    );
  }

  async check(): Promise<boolean> {
    switch (this.type) {
      case TriggerType.POWER_SAVER: {
        // Compare power profile
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
    this.check().then((initialState) => {
      debugLog(
        `[SystemTrigger] Initial check result: ${initialState}. Strategy: ${
          this.strategy
        } (${
          this.strategy === TriggerStrategy.NEW_CHANGE_ONLY
            ? 'NEW_CHANGE_ONLY'
            : 'OTHER'
        })`
      );

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
            debugLog(`[SystemTrigger] Emitting triggered from InitialCheck`);
            this.emit('triggered');
          }
        }
      } else {
        debugLog(
          `[SystemTrigger] Initial check complete but _lastMatch already set (Race lost): ${this._lastMatch}`
        );
      }
    });

    const callback = async (_state: boolean) => {
      // Re-evaluate condition
      const isMatch = await this.check();

      if (this._lastMatch === null) {
        const shouldIgnoreInitial =
          this.strategy === TriggerStrategy.NEW_CHANGE_ONLY;

        // Baseline NEW_CHANGE_ONLY
        if (shouldIgnoreInitial) {
          debugLog(
            `[SystemTrigger] ${this.type} Initial Callback: ${isMatch} (Ignored by Strategy)`
          );
          this._lastMatch = isMatch;
          return;
        } else {
          debugLog(
            `[SystemTrigger] ${this.type} Initial Callback: ${isMatch} (Checking immediate)`
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
