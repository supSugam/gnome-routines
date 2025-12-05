import { BaseTrigger } from './base.js';
import { TimeTriggerConfig, TriggerType } from '../types.js';

export class TimeTrigger extends BaseTrigger {
  private _lastState: boolean = false;

  constructor(id: string, config: TimeTriggerConfig) {
    super(id, TriggerType.TIME, config);
  }

  check(): boolean {
    const now = new Date();

    // Day check
    if (this.config.days && this.config.days.length > 0) {
      // GNOME/JS Date.getDay() returns 0 for Sunday.
      // Our UI likely maps Mon=0...Sun=6 or similar.
      // Let's assume standard JS 0=Sun, 1=Mon...
      if (!this.config.days.includes(now.getDay())) {
        this._lastState = false;
        return false;
      }
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Specific Time (Event-like, but treated as 1-minute state)
    if (this.config.time) {
      const [targetHour, targetMinute] = this.config.time
        .split(':')
        .map(Number);
      const targetMinutes = targetHour * 60 + targetMinute;
      const isTime = currentMinutes === targetMinutes;

      // For specific time, we just return true when it matches.
      // It's naturally transient (1 minute window).
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

    // @ts-ignore
    const GLib = imports.gi.GLib;

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
      // @ts-ignore
      const GLib = imports.gi.GLib;
      GLib.source_remove(this.intervalId);
      this.intervalId = null;
    }
  }
}
