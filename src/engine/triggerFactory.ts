import { Trigger } from './types.js';
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
      case 'app':
        return new AppTrigger(data.id, data.config);
      case 'time':
        return new TimeTrigger(data.id, data.config);
      case 'wifi':
        return new WifiTrigger(data.id, data.config, adapter);
      case 'bluetooth':
        return new BluetoothTrigger(data.id, data.config, adapter);
      case 'battery':
        return new BatteryTrigger(data.id, data.config, adapter);
      case 'system':
        return new SystemTrigger(data.id, data.config, adapter);
      case 'clipboard':
        return new ClipboardTrigger(data.id, data.config, adapter);
      case 'startup':
        return new StartupTrigger(data.id, data.config);
      default:
        console.warn(`Unknown trigger type: ${data.type}`);
        return null;
    }
  }
}
