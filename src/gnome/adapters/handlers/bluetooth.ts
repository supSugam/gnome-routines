// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import GLib from 'gi://GLib';
import debugLog from '../../../utils/log.js';

export class BluetoothAdapter {
  setBluetooth(enabled: boolean): Promise<void> {
    debugLog(`[BluetoothAdapter] Setting Bluetooth to: ${enabled}`);
    return new Promise((resolve) => {
      try {
        // Use bluetoothctl (BlueZ control) - most reliable method
        const command = enabled
          ? ['bluetoothctl', 'power', 'on']
          : ['bluetoothctl', 'power', 'off'];

        const proc = new Gio.Subprocess({
          argv: command,
          flags: Gio.SubprocessFlags.NONE,
        });
        proc.init(null);
        proc.wait_check_async(null, (proc: any, res: any) => {
          try {
            proc.wait_check_finish(res);
            debugLog(
              `[BluetoothAdapter] Bluetooth ${
                enabled ? 'enabled' : 'disabled'
              } via bluetoothctl`
            );
          } catch (e) {
            debugLog(
              `[BluetoothAdapter] bluetoothctl failed, trying rfkill: ${e}`
            );
            // Fallback to rfkill
            const rfkillCommand = enabled
              ? 'rfkill unblock bluetooth'
              : 'rfkill block bluetooth';
            GLib.spawn_command_line_async(rfkillCommand);
          }
          resolve();
        });
      } catch (e) {
        debugLog('[BluetoothAdapter] Failed to set Bluetooth:', e);
        // Try rfkill as last resort
        try {
          const rfkillCommand = enabled
            ? 'rfkill unblock bluetooth'
            : 'rfkill block bluetooth';
          GLib.spawn_command_line_async(rfkillCommand);
        } catch (err) {
          debugLog('[BluetoothAdapter] rfkill fallback failed:', err);
        }
        resolve();
      }
    });
  }

  async getBluetooth(): Promise<boolean> {
    try {
      const proxy = new Gio.DBusProxy({
        g_connection: Gio.DBus.system,
        g_name: 'org.bluez',
        g_object_path: '/org/bluez/hci0',
        g_interface_name: 'org.bluez.Adapter1',
      });

      // Try DBus property read first
      const result = proxy.get_cached_property('Powered');
      if (result) {
        return result.get_boolean();
      }

      // Fallback to bluetoothctl if DBus fails or not cached
      return new Promise((resolve) => {
        const proc = new Gio.Subprocess({
          argv: ['bluetoothctl', 'show'],
          flags: Gio.SubprocessFlags.STDOUT_PIPE,
        });
        proc.init(null);

        proc.communicate_utf8_async(null, null, (proc: any, res: any) => {
          try {
            const [ok, stdout, stderr] = proc.communicate_utf8_finish(res);
            if (ok && stdout) {
              const match = stdout.match(/Powered:\s*(yes|no)/i);
              if (match) {
                resolve(match[1].toLowerCase() === 'yes');
                return;
              }
            }
            resolve(false);
          } catch (e) {
            debugLog(
              '[BluetoothAdapter] Failed to get Bluetooth state (async):',
              e
            );
            resolve(false);
          }
        });
      });
    } catch (e) {
      debugLog('[BluetoothAdapter] Failed to get Bluetooth power:', e);
      return false;
    }
  }

  connectBluetoothDevice(id: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        let mac = id;
        if (!id.includes(':')) {
          // Resolve name to MAC if needed (Simplified implementation for now)
          // In a full implementation, we'd list devices and find the MAC
          const proc = new Gio.Subprocess({
            argv: ['bluetoothctl', 'devices'],
            flags: Gio.SubprocessFlags.STDOUT_PIPE,
          });
          proc.init(null);
          proc.communicate_utf8_async(null, null, (proc: any, res: any) => {
            try {
              const [ok, stdout, stderr] = proc.communicate_utf8_finish(res);
              if (ok && stdout) {
                const lines = stdout.split('\n');
                for (const line of lines) {
                  if (line.includes(id)) {
                    const match = line.match(/^Device\s+([0-9A-F:]+)\s+(.+)$/i);
                    if (match && match[2] === id) {
                      mac = match[1];
                      break;
                    }
                  }
                }
              }
            } catch (e) {
              debugLog(
                '[BluetoothAdapter] Failed to resolve bluetooth device (async):',
                e
              );
            }

            const connectProc = new Gio.Subprocess({
              argv: ['bluetoothctl', 'connect', mac],
              flags: Gio.SubprocessFlags.NONE,
            });
            connectProc.init(null);
            resolve();
          });
          return;
        }

        const connectProc = new Gio.Subprocess({
          argv: ['bluetoothctl', 'connect', mac],
          flags: Gio.SubprocessFlags.NONE,
        });
        connectProc.init(null);
        resolve();
      } catch (e) {
        debugLog('[BluetoothAdapter] Failed to connect bluetooth device:', e);
        resolve();
      }
    });
  }

  async disconnectBluetoothDevice(id: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        let mac = id;
        const proc = new Gio.Subprocess({
          argv: ['bluetoothctl', 'disconnect', mac],
          flags: Gio.SubprocessFlags.STDOUT_PIPE,
        });
        proc.init(null);
        proc.communicate_utf8_async(null, null, (proc: any, res: any) => {
          try {
            proc.communicate_utf8_finish(res);
            resolve();
          } catch (e) {
            debugLog('[BluetoothAdapter] Failed to disconnect BT async:', e);
            resolve();
          }
        });
      } catch (e) {
        debugLog(
          '[BluetoothAdapter] Failed to disconnect bluetooth device:',
          e
        );
        resolve();
      }
    });
  }

  onBluetoothPowerStateChanged(
    callback: (isEnabled: boolean) => void
  ): () => void {
    try {
      debugLog(
        '[BluetoothAdapter] Subscribing to system DBus signal: org.freedesktop.DBus.Properties.PropertiesChanged'
      );
      const signalId = Gio.DBus.system.signal_subscribe(
        null,
        'org.freedesktop.DBus.Properties',
        'PropertiesChanged',
        null,
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
              interfaceName === 'org.bluez.Adapter1' &&
              changedProps.Powered !== undefined
            ) {
              const newState = changedProps.Powered.get_boolean();
              debugLog(
                `[BluetoothAdapter] Bluetooth Powered state changed to: ${newState}`
              );
              callback(newState);
            }
          } catch (err) {
            debugLog(`[BluetoothAdapter] Error parsing DBus signal: ${err}`);
          }
        }
      );

      return () => {
        try {
          Gio.DBus.system.signal_unsubscribe(signalId);
        } catch (e) {
          debugLog('[BluetoothAdapter] Error unsubscribe bluetooth power', e);
        }
      };
    } catch (e) {
      debugLog('[BluetoothAdapter] Failed to subscribe to Bluetooth power:', e);
      return () => {};
    }
  }

  onBluetoothDeviceStateChanged(callback: () => void): () => void {
    try {
      debugLog(
        '[BluetoothAdapter] Subscribing to Bluetooth device connection changes'
      );
      const signalId = Gio.DBus.system.signal_subscribe(
        null,
        'org.freedesktop.DBus.Properties',
        'PropertiesChanged',
        null,
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

            // Watch for Device1 Connected property changes
            if (
              interfaceName === 'org.bluez.Device1' &&
              changedProps.Connected !== undefined
            ) {
              const connected = changedProps.Connected.get_boolean();
              debugLog(
                `[BluetoothAdapter] Device connection changed on ${path}: ${connected}`
              );
              callback();
            }
          } catch (err) {
            debugLog(
              `[BluetoothAdapter] Error parsing device DBus signal: ${err}`
            );
          }
        }
      );

      return () => {
        try {
          Gio.DBus.system.signal_unsubscribe(signalId);
        } catch (e) {
          debugLog('[BluetoothAdapter] Error unsubscribe device state', e);
        }
      };
    } catch (e) {
      debugLog('[BluetoothAdapter] Failed to subscribe to device state:', e);
      return () => {};
    }
  }

  getConnectedBluetoothDevices(): Promise<{ name: string; address: string }[]> {
    return new Promise((resolve) => {
      try {
        Gio.DBus.system.call(
          'org.bluez',
          '/',
          'org.freedesktop.DBus.ObjectManager',
          'GetManagedObjects',
          null,
          null,
          Gio.DBusCallFlags.NONE,
          -1,
          null,
          (connection: any, res: any) => {
            try {
              const result = connection.call_finish(res);
              if (!result) {
                resolve([]);
                return;
              }

              const [objects] = result.deep_unpack();
              const devices: { name: string; address: string }[] = [];

              const unpackVariant = (val: any): any => {
                if (val instanceof GLib.Variant) {
                  return val.deep_unpack();
                }
                return val;
              };

              for (const objectPath in objects) {
                const interfaces = objects[objectPath];
                if ('org.bluez.Device1' in interfaces) {
                  const deviceProps = interfaces['org.bluez.Device1'];
                  const connected = unpackVariant(deviceProps.Connected);

                  if (connected) {
                    const name =
                      unpackVariant(deviceProps.Name) || 'Unknown Device';
                    const address = unpackVariant(deviceProps.Address);
                    devices.push({ name, address });
                  }
                }
              }
              resolve(devices);
            } catch (e) {
              debugLog('[BluetoothAdapter] Error parsing managed objects:', e);
              resolve([]);
            }
          }
        );
      } catch (e) {
        debugLog('[BluetoothAdapter] Failed to get connected devices:', e);
        resolve([]);
      }
    });
  }
}
