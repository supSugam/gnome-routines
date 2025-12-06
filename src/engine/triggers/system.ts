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
        currentState = this.adapter.getPowerSaverState();
        break;
      case TriggerType.DARK_MODE:
        currentState = this.adapter.getDarkModeState();
        break;
      case TriggerType.AIRPLANE_MODE:
        currentState = this.adapter.getAirplaneModeState();
        break;
      case TriggerType.HEADPHONES:
        currentState = this.adapter.getWiredHeadphonesState();
        break;
    }

    const targetState =
      this.config.state === 'on' || this.config.state === 'connected';
    debugLog(
      `[SystemTrigger] Checking ${this.config.type}. Current: ${currentState}, Target: ${targetState}`
    );

    return currentState === targetState;
  }

  activate(): void {
    if (this._isActivated) return;

    debugLog(`[SystemTrigger] Activating listener for ${this.config.type}`);

    const callback = (state: boolean) => {
      debugLog(`[SystemTrigger] ${this.config.type} changed to: ${state}`);
      this.emit('triggered');
    };

    switch (this.config.type) {
      case TriggerType.POWER_SAVER:
        this.adapter.onPowerSaverStateChanged(callback);
        break;
      case TriggerType.DARK_MODE:
        this.adapter.onDarkModeStateChanged(callback);
        break;
      case TriggerType.AIRPLANE_MODE:
        this.adapter.onAirplaneModeStateChanged(callback);
        break;
      case TriggerType.HEADPHONES:
        this.adapter.onWiredHeadphonesStateChanged(callback);
        break;
    }

    this._isActivated = true;
  }
}
