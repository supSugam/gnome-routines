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
  private _lastMatch: boolean | null = null;

  private cleanup: (() => void) | null = null;

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
    debugLog(`[BatteryTrigger] Activating listener`);
    this._isActivated = true;

    // Initialize baseline
    this.check().then((isMatch) => {
      this._lastMatch = isMatch;
      debugLog(`[BatteryTrigger] Initial state: ${isMatch}`);
    });

    this.cleanup = this.adapter.onBatteryStateChanged(
      async (level, isCharging) => {
        // Re-evaluate condition
        const isMatch = await this.check();

        if (this._lastMatch === null) {
          this._lastMatch = isMatch;
          return;
        }

        // Emitting only on state change prevents spamming
        if (isMatch !== this._lastMatch) {
          debugLog(
            `[BatteryTrigger] Condition changed: ${this._lastMatch} -> ${isMatch}`
          );
          this._lastMatch = isMatch;
          if (isMatch) {
            this.emit('triggered');
          }
        }
      }
    );
  }

  deactivate(): void {
    if (!this._isActivated) return;

    debugLog(`[BatteryTrigger] Deactivating listener`);
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
    this._isActivated = false;
    this._lastMatch = null;
  }
}
