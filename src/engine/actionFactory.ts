import { Action } from './types.js';
import { WallpaperAction } from './actions/wallpaper.js';
import { DndAction } from './actions/dnd.js';
import { VolumeAction } from './actions/volume.js';
import { BrightnessAction } from './actions/brightness.js';
import { KeyboardBrightnessAction } from './actions/keyboardBrightness.js';
import {
  WifiAction,
  BluetoothAction,
  BluetoothDeviceAction,
  AirplaneModeAction,
} from './actions/connection.js';
import {
  DarkModeAction,
  NightLightAction,
  ScreenTimeoutAction,
  ScreenOrientationAction,
  RefreshRateAction,
} from './actions/display.js';
import { PowerSaverAction } from './actions/power.js';
import {
  OpenLinkAction,
  ScreenshotAction,
  OpenAppAction,
} from './actions/function.js';
import { SystemAdapter } from '../gnome/adapters/adapter.js';
import { StateManager } from './stateManager.js';

export class ActionFactory {
  static create(
    data: any,
    adapter: SystemAdapter,
    stateManager: StateManager,
    routineId: string
  ): Action | null {
    switch (data.type) {
      case 'wallpaper':
        return new WallpaperAction(data.id, data.config, adapter);
      case 'dnd':
        return new DndAction(data.id, data.config, adapter);
      case 'wifi':
        return new WifiAction(data.id, data.config, adapter);
      case 'bluetooth':
        return new BluetoothAction(data.id, data.config, adapter);
      case 'bluetooth_device':
        return new BluetoothDeviceAction(data.id, data.config, adapter);
      case 'airplane_mode':
        return new AirplaneModeAction(data.id, data.config, adapter);
      case 'dark_mode':
        return new DarkModeAction(
          data.id,
          data.config,
          adapter,
          stateManager,
          routineId
        );
      case 'night_light':
        return new NightLightAction(
          data.id,
          data.config,
          adapter,
          stateManager,
          routineId
        );
      case 'screen_timeout':
        return new ScreenTimeoutAction(
          data.id,
          data.config,
          adapter,
          stateManager,
          routineId
        );
      case 'screen_orientation':
        return new ScreenOrientationAction(data.id, data.config, adapter);
      case 'refresh_rate':
        return new RefreshRateAction(
          data.id,
          data.config,
          adapter,
          stateManager,
          routineId
        );
      case 'power_saver':
        return new PowerSaverAction(data.id, data.config, adapter);
      case 'open_link':
        return new OpenLinkAction(data.id, data.config, adapter);
      case 'screenshot':
        return new ScreenshotAction(data.id, data.config, adapter);
      case 'open_app':
        return new OpenAppAction(data.id, data.config, adapter);
      case 'volume':
        return new VolumeAction(data.id, data.config, adapter);
      case 'brightness':
        return new BrightnessAction(data.id, data.config, adapter);
      case 'keyboard_brightness':
        return new KeyboardBrightnessAction(data.id, data.config, adapter);
      default:
        console.warn(`Unknown action type: ${data.type}`);
        return null;
    }
  }
}
