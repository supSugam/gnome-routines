// @ts-ignore
import GLib from 'gi://GLib';
import { BaseTrigger } from './base.js';
import { TriggerType } from '../types.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import { StateManager } from '../stateManager.js';
import debugLog from '../../utils/log.js';

const STATE_KEY_LAST_TRIGGER = 'interval_lastTriggerTime';

export class IntervalTrigger extends BaseTrigger {
  private _timeoutId: number | null = null;
  private _stateManager: StateManager | undefined;
  private _routineId: string | undefined;

  constructor(
    id: string,
    config: any,
    _adapter: SystemAdapter,
    stateManager?: StateManager,
    routineId?: string
  ) {
    super(id, TriggerType.INTERVAL, config);
    this._stateManager = stateManager;
    this._routineId = routineId;
  }

  private getIntervalSeconds(): number {
    if (!this.config?.interval || this.config.interval <= 0) {
      return 0;
    }

    let intervalSeconds = this.config.interval;

    if (this.config.unit === 'hours') {
      intervalSeconds *= 3600;
    } else {
      intervalSeconds *= 60;
    }

    // 1 min min
    if (intervalSeconds < 60) intervalSeconds = 60;

    return intervalSeconds;
  }

  private saveLastTriggerTime(): void {
    if (this._stateManager && this._routineId) {
      this._stateManager.setState(
        this._routineId,
        STATE_KEY_LAST_TRIGGER,
        Date.now()
      );
    }
  }

  private getLastTriggerTime(): number | null {
    if (this._stateManager && this._routineId) {
      return this._stateManager.restoreState(
        this._routineId,
        STATE_KEY_LAST_TRIGGER
      );
    }

    return null;
  }

  activate(): void {
    if (this._timeoutId) {
      GLib.source_remove(this._timeoutId);
      this._timeoutId = null;
    }

    const intervalSeconds = this.getIntervalSeconds();

    if (intervalSeconds <= 0) {
      debugLog('[IntervalTrigger] Invalid interval, not activating.');

      return;
    }

    // Calculate remaining time if we have a last trigger time
    const lastTriggerTime = this.getLastTriggerTime();
    let initialDelay = intervalSeconds;

    if (lastTriggerTime) {
      const elapsed = Math.floor((Date.now() - lastTriggerTime) / 1000);
      const remaining = intervalSeconds - elapsed;

      if (remaining <= 0) {
        // Overdue execution
        debugLog(
          `[IntervalTrigger] Overdue by ${-remaining}s. Firing immediately.`
        );
        this.saveLastTriggerTime();
        this.emit('triggered');
        initialDelay = intervalSeconds;
      } else {
        debugLog(
          `[IntervalTrigger] Resuming. ${remaining}s remaining until next trigger.`
        );
        initialDelay = remaining;
      }
    } else {
      debugLog(
        `[IntervalTrigger] First activation. Will trigger in ${intervalSeconds}s.`
      );
    }

    // Start timer
    this._timeoutId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      initialDelay,
      () => {
        debugLog('[IntervalTrigger] Interval fired.');
        this.saveLastTriggerTime();
        this.emit('triggered');

        // Normalize interval
        if (initialDelay !== intervalSeconds) {
          this._timeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            intervalSeconds,
            () => {
              this.saveLastTriggerTime();
              this.emit('triggered');

              return GLib.SOURCE_CONTINUE;
            }
          );

          return GLib.SOURCE_REMOVE; // Remove this one-shot timer
        }

        return GLib.SOURCE_CONTINUE;
      }
    );
  }

  deactivate(): void {
    if (this._timeoutId) {
      GLib.source_remove(this._timeoutId);
      this._timeoutId = null;
    }
    // Keep state for resume
  }

  async check(): Promise<boolean> {
    // Event-based only
    return false;
  }
}
