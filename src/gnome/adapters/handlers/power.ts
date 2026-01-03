// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import GLib from 'gi://GLib';
import debugLog from '../../../utils/log.js';

const UPOWER_SERVICE = 'org.freedesktop.UPower';
const UPOWER_DISPLAY_DEVICE = '/org/freedesktop/UPower/devices/DisplayDevice';

export class PowerAdapter {
  setBluetooth(enabled: boolean): void {
    // This seems misplaced - belongs in BluetoothAdapter
  }

  setPowerSaver(enabled: boolean): void {
    // Legacy method - forward to setPowerProfile
    this.setPowerProfile(enabled ? 'power-saver' : 'balanced');
  }

  setPowerProfile(profile: string): void {
    debugLog(`[PowerAdapter] Setting power profile to: ${profile}`);
    try {
      const proc = new Gio.Subprocess({
        argv: ['powerprofilesctl', 'set', profile],
        flags: Gio.SubprocessFlags.NONE,
      });
      proc.init(null);
      proc.wait_check_async(null, (proc: any, res: any) => {
        try {
          proc.wait_check_finish(res);
          debugLog(`[PowerAdapter] Power profile set to ${profile}`);
        } catch (e) {
          debugLog('[PowerAdapter] Failed to set power profile (async):', e);
        }
      });
    } catch (e) {
      debugLog('[PowerAdapter] Failed to initiate set power profile:', e);
    }
  }

  getPowerSaver(): boolean {
    // Legacy method - returns true if profile is power-saver
    return this.getPowerProfile() === 'power-saver';
  }

  getPowerProfile(): string {
    try {
      const result = Gio.DBus.system.call_sync(
        'net.hadess.PowerProfiles',
        '/net/hadess/PowerProfiles',
        'org.freedesktop.DBus.Properties',
        'Get',
        new GLib.Variant('(ss)', ['net.hadess.PowerProfiles', 'ActiveProfile']),
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null
      );
      const variant = result.get_child_value(0);
      return variant.get_variant().get_string()[0];
    } catch (e) {
      debugLog('[PowerAdapter] Failed to get power profile sync via DBus', e);
      return 'balanced'; // Default
    }
  }

  onPowerProfileChanged(callback: (profile: string) => void): () => void {
    try {
      debugLog('[PowerAdapter] Subscribing to power profile changes');
      const signalId = Gio.DBus.system.signal_subscribe(
        'net.hadess.PowerProfiles',
        'org.freedesktop.DBus.Properties',
        'PropertiesChanged',
        '/net/hadess/PowerProfiles',
        null,
        0,
        (
          connection: any,
          sender: any,
          path: any,
          iface: any,
          signal: any,
          params: any
        ) => {
          try {
            const unpacked = params.deep_unpack();
            const interfaceName = unpacked[0];
            const changedProps = unpacked[1];

            if (
              interfaceName === 'net.hadess.PowerProfiles' &&
              changedProps.ActiveProfile !== undefined
            ) {
              const newProfile = changedProps.ActiveProfile.get_string()[0];
              debugLog(
                `[PowerAdapter] Power profile changed to: ${newProfile}`
              );
              callback(newProfile);
            }
          } catch (err) {
            debugLog(
              `[PowerAdapter] Error parsing power profile signal: ${err}`
            );
          }
        }
      );

      return () => {
        try {
          Gio.DBus.system.signal_unsubscribe(signalId);
        } catch (e) {
          debugLog('[PowerAdapter] Error unsubscribing power profile:', e);
        }
      };
    } catch (e) {
      debugLog(
        '[PowerAdapter] Failed to subscribe to power profile changes:',
        e
      );
      return () => {};
    }
  }

  getBatteryLevel(): number {
    try {
      const result = Gio.DBus.system.call_sync(
        UPOWER_SERVICE,
        UPOWER_DISPLAY_DEVICE,
        'org.freedesktop.DBus.Properties',
        'Get',
        new GLib.Variant('(ss)', [
          'org.freedesktop.UPower.Device',
          'Percentage',
        ]),
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null
      );
      const variant = result.get_child_value(0);
      return variant.get_variant().get_double();
    } catch (e) {
      debugLog('[PowerAdapter] Failed to get battery level:', e);
      return 100; // Default to full if unknown
    }
  }

  isCharging(): boolean {
    try {
      const result = Gio.DBus.system.call_sync(
        UPOWER_SERVICE,
        UPOWER_DISPLAY_DEVICE,
        'org.freedesktop.DBus.Properties',
        'Get',
        new GLib.Variant('(ss)', ['org.freedesktop.UPower.Device', 'State']),
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null
      );
      const variant = result.get_child_value(0);
      const state = variant.get_variant().get_uint32();
      // UPower states: 0=Unknown, 1=Charging, 2=Discharging, 3=Empty, 4=FullyCharged, 5=PendingCharge, 6=PendingDischarge
      return state === 1 || state === 4; // Charging or FullyCharged
    } catch (e) {
      debugLog('[PowerAdapter] Failed to get charging state:', e);
      return true; // Default to charging if unknown
    }
  }

  onBatteryStateChanged(
    callback: (level: number, isCharging: boolean) => void
  ): () => void {
    try {
      debugLog('[PowerAdapter] Subscribing to UPower battery changes');
      const signalId = Gio.DBus.system.signal_subscribe(
        UPOWER_SERVICE,
        'org.freedesktop.DBus.Properties',
        'PropertiesChanged',
        UPOWER_DISPLAY_DEVICE,
        null,
        0,
        (
          connection: any,
          sender: any,
          path: any,
          iface: any,
          signal: any,
          params: any
        ) => {
          try {
            const unpacked = params.deep_unpack();
            const interfaceName = unpacked[0];
            const changedProps = unpacked[1];

            if (interfaceName === 'org.freedesktop.UPower.Device') {
              // Check if relevant props changed
              if (
                changedProps.Percentage !== undefined ||
                changedProps.State !== undefined
              ) {
                const level = this.getBatteryLevel();
                const charging = this.isCharging();
                debugLog(
                  `[PowerAdapter] Battery state changed: ${level}%, charging: ${charging}`
                );
                callback(level, charging);
              }
            }
          } catch (err) {
            debugLog(`[PowerAdapter] Error parsing UPower signal: ${err}`);
          }
        }
      );

      return () => {
        try {
          Gio.DBus.system.signal_unsubscribe(signalId);
        } catch (e) {
          debugLog('[PowerAdapter] Error unsubscribing battery state:', e);
        }
      };
    } catch (e) {
      debugLog('[PowerAdapter] Failed to subscribe to battery changes:', e);
      return () => {};
    }
  }
}
