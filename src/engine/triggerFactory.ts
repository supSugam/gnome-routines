import { Trigger, TriggerType } from './types.js';
import { AppTrigger } from './triggers/app.js';
import { TimeTrigger } from './triggers/time.js';
import { WifiTrigger } from './triggers/wifi.js';
import { BluetoothTrigger } from './triggers/bluetooth.js';
import { BatteryTrigger } from './triggers/battery.js';
import { SystemTrigger } from './triggers/system.js';
import { ClipboardTrigger } from './triggers/clipboard.js';
import { StartupTrigger } from './triggers/startup.js';

export class TriggerFactory {
  static create(data: any, adapter: any): Trigger | null {
    switch (data.type) {
      case TriggerType.APP:
        return new AppTrigger(data.id, data.config);
      case TriggerType.TIME:
        return new TimeTrigger(data.id, data.config);
      case TriggerType.WIFI:
        return new WifiTrigger(data.id, data.config, adapter);
      case TriggerType.BLUETOOTH:
        return new BluetoothTrigger(data.id, data.config, adapter);
      case TriggerType.BATTERY:
        return new BatteryTrigger(data.id, data.config, adapter);
      case TriggerType.POWER_SAVER: // Assuming system trigger handles this via SystemTrigger
      case TriggerType.DARK_MODE:
      case TriggerType.AIRPLANE_MODE:
      case TriggerType.HEADPHONES:
      case 'system': // Backward compatibility
        return new SystemTrigger(data.id, data.config, adapter);
      case TriggerType.CLIPBOARD:
        return new ClipboardTrigger(data.id, data.config, adapter);
      case TriggerType.STARTUP:
        return new StartupTrigger(data.id, data.config, adapter);
      default:
        console.warn(`Unknown trigger type: ${data.type}`);
        return null;
    }
  }
}
