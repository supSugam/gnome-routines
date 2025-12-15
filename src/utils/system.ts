// @ts-ignore
import UPower from 'gi://UPowerGlib';
import { SystemType } from '../engine/types.js';
import debugLog from './log.js';

let cachedType: SystemType | null = null;

/**
 * Detects if the system is a Laptop or PC based on battery presence.
 * Uses a cached value after the first check.
 */
export function getSystemType(): SystemType {
  if (cachedType) return cachedType;

  try {
    const client = UPower.Client.new_full(null);
    const devices = client.get_devices();
    
    let hasBattery = false;
    
    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];
      // UPower.DeviceKind.BATTERY = 2
      if (device.kind === 2) {
        hasBattery = true;
        break;
      }
    }

    if (hasBattery) {
      debugLog('[SystemUtils] Battery detected. Determining system type: LAPTOP');
      cachedType = SystemType.LAPTOP;
    } else {
      debugLog('[SystemUtils] No battery detected. Determining system type: PC');
      cachedType = SystemType.PC;
    }
  } catch (e) {
    debugLog('[SystemUtils] Failed to detect system type via UPower:', e);
    // Fallback to LAPTOP to show all options just in case
    cachedType = SystemType.LAPTOP; 
  }

  return cachedType;
}
