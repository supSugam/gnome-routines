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
      case ActionType.WALLPAPER:
        action = new WallpaperAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case ActionType.DND:
        action = new DndAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case ActionType.WIFI:
        action = new WifiAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case ActionType.BLUETOOTH:
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
      case 'bluetooth_device': // kept for backward compatibility if needed, but should be deprecated
        action = new BluetoothDeviceAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case ActionType.AIRPLANE_MODE:
        action = new AirplaneModeAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case ActionType.DARK_MODE:
        action = new DarkModeAction(
          data.id,
          data.config,
          adapter,
          stateManager,
          routineId
        ) as unknown as Action;
        break;
      case ActionType.NIGHT_LIGHT:
        action = new NightLightAction(
          data.id,
          data.config,
          adapter,
          stateManager,
          routineId
        ) as unknown as Action;
        break;
      case ActionType.SCREEN_TIMEOUT:
        action = new ScreenTimeoutAction(
          data.id,
          data.config,
          adapter,
          stateManager,
          routineId
        ) as unknown as Action;
        break;
      case ActionType.SCREEN_ORIENTATION:
        action = new ScreenOrientationAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case ActionType.REFRESH_RATE:
        action = new RefreshRateAction(
          data.id,
          data.config,
          adapter,
          stateManager,
          routineId
        ) as unknown as Action;
        break;
      case ActionType.POWER_SAVER:
        action = new PowerSaverAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case ActionType.OPEN_LINK:
        action = new OpenLinkAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case ActionType.TAKE_SCREENSHOT: // screenshot is mapped to TAKE_SCREENSHOT ("take_screenshot") in types but might be "screenshot" in legacy
      case 'screenshot':
        action = new ScreenshotAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case ActionType.OPEN_APP:
        action = new OpenAppAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case ActionType.VOLUME:
        action = new VolumeAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case ActionType.BRIGHTNESS:
        action = new BrightnessAction(
          data.id,
          data.config,
          adapter
        ) as unknown as Action;
        break;
      case ActionType.KEYBOARD_BRIGHTNESS:
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
      case ActionType.EXECUTE_COMMAND:
        action = new ExecuteCommandAction(
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
