// @ts-ignore
import { BaseTrigger } from './base.js';
import { TriggerType } from '../types.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import debugLog from '../../utils/log.js';

export class WallpaperTrigger extends BaseTrigger {
  private _adapter: SystemAdapter;
  private _unsubscribe: (() => void) | null = null;

  constructor(id: string, config: any, adapter: SystemAdapter) {
    super(id, TriggerType.WALLPAPER, config);
    this._adapter = adapter;
  }

  activate(): void {
    if (this._unsubscribe) {
      this._unsubscribe();
    }

    this._unsubscribe = this._adapter.onWallpaperChanged((newUri: string) => {
      debugLog(`[WallpaperTrigger] Wallpaper changed to: ${newUri}`);
      this.emit('triggered');
    });

    debugLog('[WallpaperTrigger] Activated - listening for wallpaper changes');
  }

  deactivate(): void {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    debugLog('[WallpaperTrigger] Deactivated');
  }

  async check(): Promise<boolean> {
    // Wallpaper trigger is purely event-based - it fires via emit('triggered')
    // when wallpaper changes. check() returns false to prevent activation
    // on evaluate() calls (e.g., when routine config is saved).
    return false;
  }
}
