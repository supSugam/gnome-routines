import { TriggerType } from '../../engine/types.js';
import { BaseEditor } from './baseEditor.js';
import { TimeTriggerEditor } from '../features/time/triggerEditor.js';
import { BluetoothTriggerEditor } from '../features/bluetooth/triggerEditor.js';
import { WifiTriggerEditor } from '../features/wifi/triggerEditor.js';
import { AppTriggerEditor } from '../features/app/triggerEditor.js';
import { BatteryTriggerEditor } from '../features/battery/triggerEditor.js';
import { ClipboardTriggerEditor } from '../features/clipboard/triggerEditor.js';
import { AirplaneModeTriggerEditor } from '../features/connectivity/airplaneModeTriggerEditor.js';
import { DarkModeTriggerEditor } from '../features/display/darkModeTriggerEditor.js';
import { PowerSaverTriggerEditor } from '../features/power/powerSaverTriggerEditor.js';
import { HeadphonesTriggerEditor } from '../features/audio/headphonesTriggerEditor.js';
import { StartupTriggerEditor } from '../features/system/startupTriggerEditor.js';

export class TriggerEditorFactory {
  static create(
    type: string,
    config: any,
    onChange: () => void
  ): BaseEditor | null {
    switch (type) {
      case TriggerType.TIME:
        return new TimeTriggerEditor(config, onChange);
      case TriggerType.BLUETOOTH:
        return new BluetoothTriggerEditor(config, onChange);
      case TriggerType.WIFI:
        return new WifiTriggerEditor(config, onChange);
      case TriggerType.APP:
        return new AppTriggerEditor(config, onChange);
      case TriggerType.BATTERY:
        return new BatteryTriggerEditor(config, onChange);
      case TriggerType.CLIPBOARD:
        return new ClipboardTriggerEditor(config, onChange);
      case TriggerType.AIRPLANE_MODE:
        return new AirplaneModeTriggerEditor(config, onChange);
      case TriggerType.DARK_MODE:
        return new DarkModeTriggerEditor(config, onChange);
      case TriggerType.POWER_SAVER:
        return new PowerSaverTriggerEditor(config, onChange);
      case TriggerType.HEADPHONES:
        return new HeadphonesTriggerEditor(config, onChange);
      case TriggerType.STARTUP:
        return new StartupTriggerEditor(config, onChange);
      default:
        console.warn(`No editor found for trigger type: ${type}`);
        return null;
    }
  }
}
