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

      // BATTERY = 2
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

  // Default true
  cachedHasWifi = true;

  try {
    // Sync check
    const client = NM.Client.new(null);

    if (client) {
      const devices = client.get_devices();
      // WIFI = 2
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
    // Proxy check
    const proxy = new Gio.DBusProxy({
      g_connection: Gio.DBus.system,
      g_name: 'org.bluez',
      g_object_path: '/org/bluez/hci0',
      g_interface_name: 'org.bluez.Adapter1',
    });

    // Proxy validation
    if (!proxy.g_name_owner) {
      // Ownership check
    }

    // Sysfs check
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

/** Detect System Type */
export function getSystemType(): SystemType {
  if (cachedType) return cachedType;

  if (hasBattery()) {
    cachedType = SystemType.LAPTOP;
  } else {
    cachedType = SystemType.PC;
  }

  return cachedType;
}
