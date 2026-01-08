// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import GLib from 'gi://GLib';
import debugLog from '../../../utils/log.js';
import { SignalDispatcher } from '../../utils/signalDispatcher.js';

const UPOWER_SERVICE = 'org.freedesktop.UPower';
const UPOWER_DISPLAY_DEVICE = '/org/freedesktop/UPower/devices/DisplayDevice';

export class PowerAdapter {
  // Shared dispatchers
  private _profileDispatcher: SignalDispatcher<
    (profile: string) => void
  > | null = null;
  private _batteryDispatcher: SignalDispatcher<
    (level: number, isCharging: boolean) => void
  > | null = null;

  setBluetooth(_enabled: boolean): void {
    // Stub
  }

  async setPowerSaver(_enabled: boolean): Promise<boolean> {
    this.setPowerProfile(_enabled ? 'power-saver' : 'balanced');
    return true; // Assuming success for now
  }

  setPowerProfile(profile: string): void {
    debugLog(`[PowerAdapter] Setting power profile to: ${profile}`);
    try {
      Gio.DBus.system.call(
        'net.hadess.PowerProfiles',
        '/net/hadess/PowerProfiles',
        'org.freedesktop.DBus.Properties',
        'Set',
        new GLib.Variant('(ssv)', [
          'net.hadess.PowerProfiles',
          'ActiveProfile',
          GLib.Variant.new_string(profile),
        ]),
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
        (connection: any, res: any) => {
          try {
            connection.call_finish(res);
            debugLog(`[PowerAdapter] Power profile set to ${profile}`);
          } catch (e) {
            debugLog('[PowerAdapter] Failed to set power profile via DBus:', e);
          }
        }
      );
    } catch (e) {
      debugLog('[PowerAdapter] Failed to initiate set power profile:', e);
    }
  }

  getPowerSaver(): boolean {
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
    if (!this._profileDispatcher) {
      debugLog('[PowerAdapter] Creating shared power profile dispatcher');
      const subscribeFactory = (
        dispatch: (profile: string) => void
      ): number => {
        return Gio.DBus.system.signal_subscribe(
          'net.hadess.PowerProfiles',
          'org.freedesktop.DBus.Properties',
          'PropertiesChanged',
          '/net/hadess/PowerProfiles',
          null,
          0,
          (
            _conn: any,
            _sender: any,
            _path: any,
            _iface: any,
            _signal: any,
            params: any
          ) => {
            try {
              const [interfaceName, changedProps] = params.deep_unpack();
              if (
                interfaceName === 'net.hadess.PowerProfiles' &&
                changedProps.ActiveProfile !== undefined
              ) {
                const newProfile = changedProps.ActiveProfile.get_string()[0];
                debugLog(`[PowerAdapter] Power profile changed: ${newProfile}`);
                dispatch(newProfile);
              }
            } catch (_e) {}
          }
        );
      };
      const unsubscribeFactory = (signalId: number) => {
        try {
          Gio.DBus.system.signal_unsubscribe(signalId);
        } catch (_e) {}
      };
      this._profileDispatcher = new SignalDispatcher(
        'PowerProfile',
        subscribeFactory,
        unsubscribeFactory
      );
    }
    return this._profileDispatcher.addCallback(callback);
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
      return state === 1 || state === 4; // Charging or FullyCharged
    } catch (e) {
      debugLog('[PowerAdapter] Failed to get charging state:', e);
      return true; // Default to charging if unknown
    }
  }

  onBatteryStateChanged(
    callback: (level: number, isCharging: boolean) => void
  ): () => void {
    if (!this._batteryDispatcher) {
      debugLog('[PowerAdapter] Creating shared battery state dispatcher');
      const subscribeFactory = (
        dispatch: (level: number, isCharging: boolean) => void
      ): number => {
        return Gio.DBus.system.signal_subscribe(
          UPOWER_SERVICE,
          'org.freedesktop.DBus.Properties',
          'PropertiesChanged',
          UPOWER_DISPLAY_DEVICE,
          null,
          0,
          (
            _conn: any,
            _sender: any,
            _path: any,
            _iface: any,
            _signal: any,
            params: any
          ) => {
            try {
              const unpacked = params.deep_unpack();
              const interfaceName = unpacked[0];
              const changedProps = unpacked[1];

              if (interfaceName === 'org.freedesktop.UPower.Device') {
                if (
                  changedProps.Percentage !== undefined ||
                  changedProps.State !== undefined
                ) {
                  const level = this.getBatteryLevel();
                  const charging = this.isCharging();
                  dispatch(level, charging);
                }
              }
            } catch (_e) {}
          }
        );
      };
      const unsubscribeFactory = (signalId: number) => {
        try {
          Gio.DBus.system.signal_unsubscribe(signalId);
        } catch (_e) {}
      };
      this._batteryDispatcher = new SignalDispatcher(
        'Battery',
        subscribeFactory,
        unsubscribeFactory
      );
    }
    return this._batteryDispatcher.addCallback(callback);
  }
}
