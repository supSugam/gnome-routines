import { ActionType } from '../../engine/types.js';
import { BaseEditor } from './baseEditor.js';
import { OpenAppActionEditor } from '../features/app/actionEditor.js';
import { WifiActionEditor } from '../features/wifi/actionEditor.js';
import { ConnectWifiActionEditor } from '../features/wifi/connectWifiActionEditor.js';
import { BluetoothActionEditor } from '../features/bluetooth/actionEditor.js';
import { ConnectBluetoothActionEditor } from '../features/bluetooth/connectBluetoothActionEditor.js';
import { DisconnectBluetoothActionEditor } from '../features/bluetooth/disconnectBluetoothActionEditor.js';
import { DndActionEditor } from '../features/system/dndActionEditor.js';
import { AirplaneModeActionEditor } from '../features/connectivity/airplaneModeActionEditor.js';
import { VolumeActionEditor } from '../features/audio/volumeActionEditor.js';
import { BrightnessActionEditor } from '../features/display/brightnessActionEditor.js';
import { KeyboardBrightnessActionEditor } from '../features/display/keyboardBrightnessActionEditor.js';
import { WallpaperActionEditor } from '../features/display/wallpaperActionEditor.js';
import { DarkModeActionEditor } from '../features/display/darkModeActionEditor.js';
import { NightLightActionEditor } from '../features/display/nightLightActionEditor.js';
import { PowerSaverActionEditor } from '../features/power/powerSaverActionEditor.js';
import { ScreenTimeoutActionEditor } from '../features/display/screenTimeoutActionEditor.js';
import { ScreenOrientationActionEditor } from '../features/display/screenOrientationActionEditor.js';
import { ScreenshotActionEditor } from '../features/system/screenshotActionEditor.js';
import { NotificationActionEditor } from '../features/system/notificationActionEditor.js';
import { ClipboardActionEditor } from '../features/clipboard/clipboardActionEditor.js';
import { OpenLinkActionEditor } from '../features/system/openLinkActionEditor.js';

export class ActionEditorFactory {
  static create(
    type: string,
    config: any,
    onChange: () => void
  ): BaseEditor | null {
    switch (type) {
      case ActionType.OPEN_APP:
        return new OpenAppActionEditor(config, onChange);
      case ActionType.WIFI:
        return new WifiActionEditor(config, onChange);
      case ActionType.CONNECT_WIFI:
        return new ConnectWifiActionEditor(config, onChange);
      case ActionType.BLUETOOTH:
        return new BluetoothActionEditor(config, onChange);
      case ActionType.CONNECT_BLUETOOTH:
        return new ConnectBluetoothActionEditor(config, onChange);
      case ActionType.DISCONNECT_BLUETOOTH:
        return new DisconnectBluetoothActionEditor(config, onChange);
      case ActionType.DND:
        return new DndActionEditor(config, onChange);
      case ActionType.AIRPLANE_MODE:
        return new AirplaneModeActionEditor(config, onChange);
      case ActionType.VOLUME:
        return new VolumeActionEditor(config, onChange);
      case ActionType.BRIGHTNESS:
        return new BrightnessActionEditor(config, onChange);
      case ActionType.KEYBOARD_BRIGHTNESS:
        return new KeyboardBrightnessActionEditor(config, onChange);
      case ActionType.WALLPAPER:
        return new WallpaperActionEditor(config, onChange);
      case ActionType.DARK_MODE:
        return new DarkModeActionEditor(config, onChange);
      case ActionType.NIGHT_LIGHT:
        return new NightLightActionEditor(config, onChange);
      case ActionType.POWER_SAVER:
        return new PowerSaverActionEditor(config, onChange);
      case ActionType.SCREEN_TIMEOUT:
        return new ScreenTimeoutActionEditor(config, onChange);
      case ActionType.SCREEN_ORIENTATION:
        return new ScreenOrientationActionEditor(config, onChange);
      case ActionType.TAKE_SCREENSHOT:
        return new ScreenshotActionEditor(config, onChange);
      case ActionType.NOTIFICATION:
        return new NotificationActionEditor(config, onChange);
      case ActionType.CLIPBOARD:
        return new ClipboardActionEditor(config, onChange);
      case ActionType.OPEN_LINK:
        return new OpenLinkActionEditor(config, onChange);
      default:
        console.warn(`No editor found for action type: ${type}`);
        return null;
    }
  }
}
