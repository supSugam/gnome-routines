import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class WallpaperAction extends BaseAction {
    private previousWallpaper: string | null = null;

    constructor(id: string, config: { uri: string }, adapter: SystemAdapter) {
        super(id, 'wallpaper', config, adapter);
    }

    execute(): void {
        console.log(`[WallpaperAction] Executing with URI: ${this.config.uri}`);
        this.previousWallpaper = this.adapter.getWallpaper();
        this.adapter.setWallpaper(this.config.uri);
    }

    revert(): void {
        if (this.previousWallpaper) {
            this.adapter.setWallpaper(this.previousWallpaper);
        }
    }
}
