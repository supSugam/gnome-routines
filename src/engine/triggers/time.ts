import debugLog from '../../utils/log.js';
// @ts-ignore
import GLib from 'gi://GLib';
import { BaseTrigger } from './base.js';
import { TimeTriggerConfig, TriggerType, TriggerStrategy } from '../types.js';

export class TimeTrigger extends BaseTrigger {
  private _lastState: boolean = false;
  private _timeoutId: number | null = null;
  private _periodCheckId: number | null = null;

  constructor(id: string, config: TimeTriggerConfig) {
    super(id, TriggerType.TIME, config);
  }

  /** Seconds until HH:MM */
  private getSecondsUntilTime(targetTime: string): number {
    const [targetHour, targetMinute] = targetTime.split(':').map(Number);
    const now = GLib.DateTime.new_now_local();
    const currentHour = now.get_hour();
    const currentMinute = now.get_minute();
    const currentSecond = now.get_second();

    let targetSeconds = targetHour * 3600 + targetMinute * 60;
    let currentSeconds =
      currentHour * 3600 + currentMinute * 60 + currentSecond;

    let diff = targetSeconds - currentSeconds;

    // If target time has passed today, schedule for tomorrow
    if (diff <= 0) {
      diff += 24 * 3600; // Add 24 hours
    }

    return diff;
  }

  /** Valid day check */
  private isDayValid(): boolean {
    if (!this.config.days || this.config.days.length === 0) {
      return true; // No day restriction
    }
    const now = GLib.DateTime.new_now_local();
    const glibDay = now.get_day_of_week(); // 1 = Mon, 7 = Sun
    const jsDay = glibDay === 7 ? 0 : glibDay; // Convert to JS (0-6, Sun-Sat)
    return this.config.days.includes(jsDay);
  }

  /** Check inside period */
  private isInsidePeriod(): boolean {
    if (!this.config.startTime || !this.config.endTime) return false;

    const now = GLib.DateTime.new_now_local();
    const currentMinutes = now.get_hour() * 60 + now.get_minute();

    const [startH, startM] = this.config.startTime.split(':').map(Number);
    const [endH, endM] = this.config.endTime.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    if (startTotal < endTotal) {
      return currentMinutes >= startTotal && currentMinutes < endTotal;
    } else {
      // Overnight range
      return currentMinutes >= startTotal || currentMinutes < endTotal;
    }
  }

  async check(): Promise<boolean> {
    if (!this.isDayValid()) return false;

    // Specific
    if (this.config.time) {
      const now = GLib.DateTime.new_now_local();
      const currentMinutes = now.get_hour() * 60 + now.get_minute();
      const [targetHour, targetMinute] = this.config.time
        .split(':')
        .map(Number);
      const targetMinutes = targetHour * 60 + targetMinute;
      return currentMinutes === targetMinutes;
    }

    // Period
    if (this.config.startTime && this.config.endTime) {
      return this.isInsidePeriod();
    }

    return false;
  }

  activate(): void {
    debugLog(
      `[TimeTrigger] Activating for ${this.id}. Strategy: ${this.strategy}`
    );

    // Specific Time: Schedule precisely
    if (this.config.time) {
      this.scheduleExactTime();
    }
    // Period: Check on boundaries
    else if (this.config.startTime && this.config.endTime) {
      this.schedulePeriodCheck();
    }
  }

  /** Schedule exact */
  private scheduleExactTime(): void {
    if (!this.config.time) return;

    const secondsUntil = this.getSecondsUntilTime(this.config.time);
    debugLog(
      `[TimeTrigger] Scheduling ${this.id} to fire in ${secondsUntil}s (at ${this.config.time})`
    );

    // Clear any existing timeout
    if (this._timeoutId) {
      GLib.source_remove(this._timeoutId);
    }

    this._timeoutId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      secondsUntil,
      () => {
        // Check if day is valid before triggering
        if (this.isDayValid()) {
          debugLog(
            `[TimeTrigger] Exact time ${this.config.time} reached for ${this.id}. Triggering!`
          );
          this.emit('triggered');
        } else {
          debugLog(`[TimeTrigger] Time reached but day not valid. Skipping.`);
        }

        // Reschedule for next occurrence (tomorrow or next valid day)
        this.scheduleExactTime();
        return false; // Don't repeat, we reschedule manually
      }
    );
  }

  /** Schedule period */
  private schedulePeriodCheck(): void {
    if (!this.config.startTime || !this.config.endTime) return;

    const now = GLib.DateTime.new_now_local();
    const currentMinutes = now.get_hour() * 60 + now.get_minute();
    const [startH, startM] = this.config.startTime.split(':').map(Number);
    const [endH, endM] = this.config.endTime.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    const isCurrentlyInside = this.isInsidePeriod();

    // Handle initial state
    if (
      this.strategy === TriggerStrategy.EXISTING_STATE &&
      isCurrentlyInside &&
      this.isDayValid()
    ) {
      debugLog(
        `[TimeTrigger] Currently inside period. Triggering immediately.`
      );
      this._lastState = true;
      this.emit('triggered');
    } else if (isCurrentlyInside) {
      this._lastState = true; // Mark state but don't trigger (NEW_CHANGE_ONLY)
    }

    // Calculate next boundary to watch
    let nextBoundary: string;
    if (isCurrentlyInside) {
      // Currently inside - schedule for end time
      nextBoundary = this.config.endTime;
    } else {
      // Currently outside - schedule for start time
      nextBoundary = this.config.startTime;
    }

    const secondsUntil = this.getSecondsUntilTime(nextBoundary);
    debugLog(
      `[TimeTrigger] Scheduling period boundary check in ${secondsUntil}s (at ${nextBoundary}). Currently ${
        isCurrentlyInside ? 'inside' : 'outside'
      } period.`
    );

    if (this._periodCheckId) {
      GLib.source_remove(this._periodCheckId);
    }

    this._periodCheckId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      secondsUntil,
      () => {
        const newState = this.isInsidePeriod() && this.isDayValid();

        if (newState !== this._lastState) {
          debugLog(
            `[TimeTrigger] Period state changed: ${this._lastState} -> ${newState}`
          );
          this._lastState = newState;
          this.emit('triggered');
        }

        // Reschedule for next boundary
        this.schedulePeriodCheck();
        return false;
      }
    );
  }

  deactivate(): void {
    debugLog(`[TimeTrigger] Deactivating ${this.id}`);

    if (this._timeoutId) {
      GLib.source_remove(this._timeoutId);
      this._timeoutId = null;
    }

    if (this._periodCheckId) {
      GLib.source_remove(this._periodCheckId);
      this._periodCheckId = null;
    }
  }
}
