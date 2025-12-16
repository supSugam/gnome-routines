import debugLog from '../../utils/log.js';
import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import { ActionType, WallpaperActionConfig } from '../types.js';

export class WallpaperAction extends BaseAction {
  private previousWallpaper: string | null = null;

  constructor(
    id: string,
    config: WallpaperActionConfig,
    adapter: SystemAdapter
  ) {
    super(id, ActionType.WALLPAPER, config, adapter);
  }

  execute(): void {
    debugLog(`[WallpaperAction] Executing with URI: ${this.config.uri}`);
    // Only capture the previous wallpaper if we haven't already.
    // This ensures that if execute() is called multiple times while active,
    // we don't overwrite the original wallpaper with the one we just set.
    if (!this.previousWallpaper) {
      this.previousWallpaper = this.adapter.getWallpaper();
      debugLog(
        `[WallpaperAction] Captured original wallpaper: ${this.previousWallpaper}`
      );
    }
    this.adapter.setWallpaper(this.config.uri);
  }

  revert(): void {
    if (this.previousWallpaper) {
      debugLog(
        `[WallpaperAction] Reverting to wallpaper: ${this.previousWallpaper}`
      );
      this.adapter.setWallpaper(this.previousWallpaper);
      this.previousWallpaper = null; // Reset state
    }
  }
}
