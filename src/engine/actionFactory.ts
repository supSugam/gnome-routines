import { Action } from './types.js';
import { WallpaperAction } from './actions/wallpaper.js';
import { DndAction } from './actions/dnd.js';
import { BluetoothAction } from './actions/bluetooth.js';
import { VolumeAction } from './actions/volume.js';
import { BrightnessAction } from './actions/brightness.js';
import { SystemAdapter } from '../gnome/adapters/adapter.js';

export class ActionFactory {
    static create(data: any, adapter: SystemAdapter): Action | null {
        switch (data.type) {
          case 'wallpaper':
            return new WallpaperAction(data.id, data.config, adapter);
          case 'dnd':
            return new DndAction(data.id, data.config, adapter);
          case 'bluetooth':
            return new BluetoothAction(data.id, data.config, adapter);
          case 'volume':
            return new VolumeAction(data.id, data.config, adapter);
          case 'brightness':
            return new BrightnessAction(data.id, data.config, adapter);
          default:
            console.warn(`Unknown action type: ${data.type}`);
            return null;
        }
    }
}
