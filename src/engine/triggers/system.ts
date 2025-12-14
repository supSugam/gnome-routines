import { BaseTrigger } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import { TriggerType, SystemTriggerConfig, TriggerStrategy } from '../types.js';
import debugLog from '../../utils/log.js';

export class SystemTrigger extends BaseTrigger {
  private adapter: SystemAdapter;
  public _isActivated: boolean = false;

  constructor(id: string, config: SystemTriggerConfig, adapter: SystemAdapter) {
    super(id, config.type, config, TriggerStrategy.STATE_PERSISTENT);
    this.adapter = adapter;
  }

  async check(): Promise<boolean> {
    let currentState = false;

    switch (this.config.type) {
      case TriggerType.POWER_SAVER:
        currentState = await this.adapter.getPowerSaverState();
        break;
      case TriggerType.DARK_MODE:
        currentState = this.adapter.getDarkModeState();
        break;
      case TriggerType.AIRPLANE_MODE:
        currentState = await this.adapter.getAirplaneModeState();
        break;
      case TriggerType.HEADPHONES:
        currentState = await this.adapter.getWiredHeadphonesState();
        break;
    }

    const targetState =
      this.config.state === 'on' || this.config.state === 'connected';
    debugLog(
      `[SystemTrigger] Checking ${this.config.type}. Current: ${currentState}, Target: ${targetState}`
    );

    return currentState === targetState;
  }

  private _lastMatch: boolean | null = null;
  private cleanup: (() => void) | null = null;

  activate(): void {
    debugLog(`[SystemTrigger] Activating listener for ${this.config.type}`);
    this._isActivated = true;

    // Initialize state
    this.check().then((initialState) => {
      if (this._lastMatch === null) {
        debugLog(
          `[SystemTrigger] Setting initial state for ${this.config.type}: ${initialState}`
        );
        this._lastMatch = initialState;
      }
    });

    const callback = async (state: boolean) => {
      // We need to re-evaluate the full condition because "state" arg might just be the raw value
      // but check() compares it to target.
      // Actually the callback args vary by adapter method.
      // But simply calling check() is safest to get "Matched or Not".
      const isMatch = await this.check();

      if (this._lastMatch === null) {
        this._lastMatch = isMatch;
        return;
      }

      if (isMatch !== this._lastMatch) {
        debugLog(
          `[SystemTrigger] ${this.config.type} state changed: ${this._lastMatch} -> ${isMatch}`
        );
        this._lastMatch = isMatch;
        if (isMatch) {
          this.emit('triggered');
        }
      }
    };

    switch (this.config.type) {
      case TriggerType.POWER_SAVER:
        this.cleanup = this.adapter.onPowerSaverStateChanged((isActive) =>
          callback(isActive)
        );
        break;
      case TriggerType.DARK_MODE:
        this.cleanup = this.adapter.onDarkModeStateChanged((isDark) =>
          callback(isDark)
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
