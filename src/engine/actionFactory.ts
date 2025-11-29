import { Action } from './types.js';
import { WallpaperAction } from './actions/wallpaper.js';
import { DndAction } from './actions/dnd.js';
import { SystemAdapter } from '../gnome/adapters/adapter.js';

export class ActionFactory {
    static create(data: any, adapter: SystemAdapter): Action | null {
        switch (data.type) {
            case 'wallpaper':
                return new WallpaperAction(data.id, data.config, adapter);
            case 'dnd':
                return new DndAction(data.id, data.config, adapter);
            default:
                console.warn(`Unknown action type: ${data.type}`);
                return null;
        }
    }
}
