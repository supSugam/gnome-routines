// @ts-ignore
import UPower from 'gi://UPowerGlib';
// @ts-ignore
import NM from 'gi://NM';
// @ts-ignore
import Gio from 'gi://Gio';

import { SystemType } from '../engine/types.js';
import debugLog from './log.js';

let cachedType: SystemType | null = null;
let cachedHasBattery: boolean | null = null;
let cachedHasWifi: boolean | null = null;
let cachedHasBluetooth: boolean | null = null;

export function hasBattery(): boolean {
  if (cachedHasBattery !== null) return cachedHasBattery;

  try {
    const client = UPower.Client.new_full(null);
    const devices = client.get_devices();
    let batteryFound = false;

    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];
      // UPower.DeviceKind.BATTERY = 2
      if (device.kind === 2) {
        batteryFound = true;
        break;
      }
    }
    cachedHasBattery = batteryFound;
    debugLog(`[SystemUtils] Battery capability: ${batteryFound}`);
  } catch (e) {
    debugLog('[SystemUtils] Failed to check for battery:', e);
    cachedHasBattery = false;
  }
  return cachedHasBattery!;
}

export function hasWifi(): boolean {
  if (cachedHasWifi !== null) return cachedHasWifi;

  // Default to true if unsure, better to show valid option than hide valid one
  cachedHasWifi = true;

  try {
    // Try sync check first
    const client = NM.Client.new(null);
    if (client) {
      const devices = client.get_devices();
      // NM.DeviceType.WIFI = 2
      const wifiDev = devices.find((d: any) => d.device_type === 2);
      cachedHasWifi = !!wifiDev;
      debugLog(`[SystemUtils] Wifi capability: ${cachedHasWifi}`);
    }
  } catch (e) {
    debugLog('[SystemUtils] Wifi check failed, assuming true:', e);
  }
  return cachedHasWifi!;
}

export function hasBluetooth(): boolean {
  if (cachedHasBluetooth !== null) return cachedHasBluetooth;

  cachedHasBluetooth = true; // Default to true

  try {
    // fast check: see if we can get the proxy for adapter
    const proxy = new Gio.DBusProxy({
      g_connection: Gio.DBus.system,
      g_name: 'org.bluez',
      g_object_path: '/org/bluez/hci0',
      g_interface_name: 'org.bluez.Adapter1',
    });
    // Just creating proxy doesn't mean it exists.
    // Usually checking name owner or a property works.
    if (!proxy.g_name_owner) {
      // Maybe no hci0, try iterating objects? Too slow for sync.
      // If 'org.bluez' is not owned on bus, then definitely no bluetooth
      // But checking ownership synchronously might be tricky with just Proxy wrapper.
      // Actually, just let it be true for now or rely on Bluez service check.
    }
    // Better simple check:
    // Does /sys/class/bluetooth exist? (Linux specific, safe enough)
    const file = Gio.File.new_for_path('/sys/class/bluetooth');
    cachedHasBluetooth = file.query_exists(null);
    debugLog(
      `[SystemUtils] Bluetooth capability (sysfs): ${cachedHasBluetooth}`
    );
  } catch (e) {
    debugLog('[SystemUtils] Bluetooth check failed, assuming true:', e);
  }

  return cachedHasBluetooth!;
}

/**
 * Detects if the system is a Laptop or PC based on battery presence.
 * Uses a cached value after the first check.
 */
export function getSystemType(): SystemType {
  if (cachedType) return cachedType;

  if (hasBattery()) {
    cachedType = SystemType.LAPTOP;
  } else {
    cachedType = SystemType.PC;
  }
  return cachedType;
}
