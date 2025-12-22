// @ts-ignore
import GLib from 'gi://GLib';
import { BaseTrigger } from './base.js';
import { TriggerType } from '../types.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class IntervalTrigger extends BaseTrigger {
  private _timeoutId: number | null = null;

  constructor(
    id: string,
    config: any,
    _adapter: SystemAdapter
  ) {
    super(id, TriggerType.INTERVAL, config);
  }

  activate(): void {
    if (this._timeoutId) {
      GLib.source_remove(this._timeoutId);
      this._timeoutId = null;
    }

    if (!this.config?.interval || this.config.interval <= 0) {
      return;
    }

    let intervalSeconds = this.config.interval;
    if (this.config.unit === 'hours') {
      intervalSeconds *= 3600;
    } else {
      // Default to minutes
      intervalSeconds *= 60;
    }

    // Minimum 1 minute safety
    if (intervalSeconds < 60) intervalSeconds = 60;

    this._timeoutId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      intervalSeconds,
      () => {
        this.emit('triggered');
        return GLib.SOURCE_CONTINUE;
      }
    );
  }

  deactivate(): void {
    if (this._timeoutId) {
      GLib.source_remove(this._timeoutId);
      this._timeoutId = null;
    }
  }

  async check(): Promise<boolean> {
    return true;
  }
}
