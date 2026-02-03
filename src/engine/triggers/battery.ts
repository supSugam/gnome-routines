import { BaseTrigger } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import {
  BatteryTriggerMode,
  BatteryStatus,
  LevelComparison,
  TriggerType,
  TriggerStrategy,
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
    } else if (this.config.mode === BatteryTriggerMode.LEVEL) {
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

    return false;
  }

  activate(): void {
    debugLog(`[BatteryTrigger] Activating listener`);
    this._isActivated = true;

    // Initialize baseline
    this.check().then((isMatch) => this._handleState(isMatch));

    this.cleanup = this.adapter.onBatteryStateChanged(
      async (level, isCharging) => {
        const isMatch = await this.check();

        this._handleState(isMatch);
      }
    );
  }

  private _handleState(isMatch: boolean): void {
    // Initial check
    if (this._lastMatch === null) {
      if (this.strategy === TriggerStrategy.NEW_CHANGE_ONLY) {
        debugLog(
          `[BatteryTrigger] Initial state: ${isMatch} (Ignored by Strategy)`
        );
        this._lastMatch = isMatch;

        return;
      } else {
        debugLog(
          `[BatteryTrigger] Initial state: ${isMatch} (Checking immediate)`
        );
        this._lastMatch = isMatch;

        if (isMatch) {
          this.emit('triggered');
        }

        return;
      }
    }

    // State change
    if (isMatch !== this._lastMatch) {
      debugLog(
        `[BatteryTrigger] Condition changed: ${this._lastMatch} -> ${isMatch}`
      );
      this._lastMatch = isMatch;
      this.emit('triggered');
    }
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
