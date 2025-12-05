import { BaseTrigger } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import {
  BatteryTriggerMode,
  BatteryStatus,
  LevelComparison,
  TriggerType,
} from '../types.js';
import debugLog from '../../utils/log.js';

export class BatteryTrigger extends BaseTrigger {
  private adapter: SystemAdapter;
  public _isActivated: boolean = false;

  constructor(
    id: string,
    config: {
      mode: BatteryTriggerMode;
      status?: BatteryStatus;
      levelType?: LevelComparison;
      level?: number;
    },
    adapter: SystemAdapter
  ) {
    super(id, TriggerType.BATTERY, config);
    this.adapter = adapter;
  }

  async check(): Promise<boolean> {
    if (this.config.mode === BatteryTriggerMode.STATUS) {
      const isCharging = this.adapter.isCharging();
      debugLog(
        `[BatteryTrigger] Checking status. Current: ${
          isCharging ? BatteryStatus.CHARGING : BatteryStatus.DISCHARGING
        }, Target: ${this.config.status}`
      );
      return this.config.status === BatteryStatus.CHARGING
        ? isCharging
        : !isCharging;
    } else {
      const currentLevel = this.adapter.getBatteryLevel();
      const targetLevel = this.config.level || 0;
      debugLog(
        `[BatteryTrigger] Checking level. Current: ${currentLevel}, Target: ${this.config.levelType} ${targetLevel}`
      );

      if (this.config.levelType === LevelComparison.BELOW) {
        return currentLevel < targetLevel;
      } else {
        return currentLevel >= targetLevel;
      }
    }
  }

  activate(): void {
    if (this._isActivated) return;

    debugLog(`[BatteryTrigger] Activating listener`);
    this.adapter.onBatteryStateChanged((level, isCharging) => {
      debugLog(
        `[BatteryTrigger] Battery state changed: ${level}%, Charging: ${isCharging}`
      );
      this.emit('triggered');
    });

    this._isActivated = true;
  }
}
