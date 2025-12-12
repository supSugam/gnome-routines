import debugLog from '../../utils/log.js';
// @ts-ignore
import GLib from 'gi://GLib';
import { BaseTrigger } from './base.js';
import { TimeTriggerConfig, TriggerType, TriggerStrategy } from '../types.js';

export class TimeTrigger extends BaseTrigger {
  private _lastState: boolean = false;

  constructor(id: string, config: TimeTriggerConfig) {
    super(id, TriggerType.TIME, config, TriggerStrategy.STATE_PERSISTENT);
  }

  async check(): Promise<boolean> {
    const now = GLib.DateTime.new_now_local();
    const currentHour = now.get_hour(); // 0-23
    const currentMinute = now.get_minute(); // 0-59
    const currentDay = now.get_day_of_week(); // 1 = Mon, 7 = Sun

    // Day check
    if (this.config.days && this.config.days.length > 0) {
      // GLib (1-7, Mon-Sun) -> JS (0-6, Sun-Sat)
      const jsDay = currentDay === 7 ? 0 : currentDay;
      if (!this.config.days.includes(jsDay)) {
        this._lastState = false;
        return false;
      }
    }

    const currentMinutes = currentHour * 60 + currentMinute;

    // Specific Time (Event-like, but treated as 1-minute state)
    if (this.config.time) {
      const [targetHour, targetMinute] = this.config.time
        .split(':')
        .map(Number);
      const targetMinutes = targetHour * 60 + targetMinute;
      const isTime = currentMinutes === targetMinutes;

      return isTime;
    }

    // Time Period (State)
    if (this.config.startTime && this.config.endTime) {
      const [startH, startM] = this.config.startTime.split(':').map(Number);
      const [endH, endM] = this.config.endTime.split(':').map(Number);

      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;

      let isActive = false;
      if (startTotal < endTotal) {
        // Normal range (e.g. 09:00 to 17:00)
        isActive = currentMinutes >= startTotal && currentMinutes < endTotal;
      } else {
        // Overnight range (e.g. 22:00 to 06:00)
        isActive = currentMinutes >= startTotal || currentMinutes < endTotal;
      }

      return isActive;
    }

    return false;
  }

  private intervalId: number | null = null;

  activate(): void {
    if (this.intervalId) return;

    debugLog(`[TimeTrigger] Activating polling for ${this.id}`);

    // Check every minute (60 seconds)
    this.intervalId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      60,
      () => {
        this.emit('triggered');
        return true; // Continue
      }
    );
  }

  deactivate(): void {
    if (this.intervalId) {
      debugLog(`[TimeTrigger] Deactivating polling for ${this.id}`);
      GLib.source_remove(this.intervalId);
      this.intervalId = null;
    }
  }
}
