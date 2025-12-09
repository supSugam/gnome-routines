import debugLog from '../utils/log.js';
import { Action, ActionType } from './types.js';
import { WallpaperAction } from './actions/wallpaper.js';
import { DndAction } from './actions/dnd.js';
import { VolumeAction } from './actions/volume.js';
import { BrightnessAction } from './actions/brightness.js';
import { KeyboardBrightnessAction } from './actions/keyboardBrightness.js';
import { ClipboardAction } from './actions/clipboard.js';
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
  ExecuteCommandAction as ExecCmdAction,
} from './actions/function.js';
import { ExecuteCommandAction } from './actions/command.js';
import { SystemAdapter } from '../gnome/adapters/adapter.js';
import { StateManager } from './stateManager.js';

export class ActionFactory {
  static create(
    data: any,
    adapter: SystemAdapter,
    stateManager: StateManager,
    routineId: string
  ): Action | null {
    let action: Action | null = null;
    debugLog(`[ActionFactory] Creating action type: ${data.type}`);

    switch (data.type) {
      case 'wallpaper':
        action = new WallpaperAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case 'dnd':
        action = new DndAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case 'wifi':
        action = new WifiAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case 'bluetooth':
        action = new BluetoothAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case ActionType.CONNECT_BLUETOOTH:
      case ActionType.DISCONNECT_BLUETOOTH:
        action = new BluetoothDeviceAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case 'bluetooth_device':
        action = new BluetoothDeviceAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case 'airplane_mode':
        action = new AirplaneModeAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case 'dark_mode':
        action = new DarkModeAction(
          data.id,
          data.config,
          adapter,
          stateManager,
          routineId
        ) as unknown as Action;
        break;
      case 'night_light':
        action = new NightLightAction(
          data.id,
          data.config,
          adapter,
          stateManager,
          routineId
        ) as unknown as Action;
        break;
      case 'screen_timeout':
        action = new ScreenTimeoutAction(
          data.id,
          data.config,
          adapter,
          stateManager,
          routineId
        ) as unknown as Action;
        break;
      case 'screen_orientation':
        action = new ScreenOrientationAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case 'refresh_rate':
        action = new RefreshRateAction(
          data.id,
          data.config,
          adapter,
          stateManager,
          routineId
        ) as unknown as Action;
        break;
      case 'power_saver':
        action = new PowerSaverAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case 'open_link':
        action = new OpenLinkAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case 'screenshot':
        action = new ScreenshotAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case 'open_app':
        action = new OpenAppAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case 'volume':
        action = new VolumeAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case 'brightness':
        action = new BrightnessAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case 'keyboard_brightness':
        action = new KeyboardBrightnessAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case ActionType.CLIPBOARD:
        return new ClipboardAction(
          data.id,
          data.config as any,
          adapter
        ) as unknown as Action;
        break;
      default:
        console.warn(`Unknown action type: ${data.type}`);
        return null;
    }

    if (action && data.onDeactivate) {
      action.onDeactivate = data.onDeactivate;
    }

    return action;
  }
}
