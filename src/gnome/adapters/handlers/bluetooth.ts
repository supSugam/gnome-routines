// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import GLib from 'gi://GLib';
import debugLog from '../../../utils/log.js';
import { SignalDispatcher } from '../../utils/signalDispatcher.js';

export class BluetoothAdapter {
  private _adapterPath: string | null = null;

  // Shared dispatchers - one subscription, many listeners
  private _powerDispatcher: SignalDispatcher<
    (enabled: boolean) => void
  > | null = null;
  private _deviceDispatcher: SignalDispatcher<() => void> | null = null;

  constructor() {
    this._findAdapterPath().then((path) => {
      if (path) this._adapterPath = path;
    });
  }

  private async _findAdapterPath(): Promise<string | null> {
    if (this._adapterPath) return this._adapterPath;

    let path = '/org/bluez/hci0';

    return new Promise((resolve) => {
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
            const [objects] = result.deep_unpack();
            for (const objectPath in objects) {
              if ('org.bluez.Adapter1' in objects[objectPath]) {
                resolve(objectPath);
                return;
              }
            }
            resolve(path);
          } catch (e) {
            resolve(path);
          }
        }
      );
    });
  }

  async setBluetooth(enabled: boolean): Promise<void> {
    debugLog(`[BluetoothAdapter] Setting Bluetooth to: ${enabled}`);
    const path = await this._findAdapterPath();
    if (!path) return;

    try {
      const current = await this.getBluetooth();
      if (current === enabled) return;

      Gio.DBus.system.call(
        'org.bluez',
        path,
        'org.freedesktop.DBus.Properties',
        'Set',
        new GLib.Variant('(ssv)', [
          'org.bluez.Adapter1',
          'Powered',
          GLib.Variant.new_boolean(enabled),
        ]),
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
        (connection: any, res: any) => {
          try {
            connection.call_finish(res);
            debugLog(`[BluetoothAdapter] Bluetooth set to ${enabled}`);
          } catch (e) {
            debugLog('[BluetoothAdapter] Failed to set Bluetooth property:', e);
          }
        }
      );
    } catch (e) {
      debugLog('[BluetoothAdapter] Failed to initiate set Bluetooth:', e);
    }
  }

  async getBluetooth(): Promise<boolean> {
    const path = await this._findAdapterPath();
    if (!path) return false;

    try {
      const result = await new Promise<any>((resolve, reject) => {
        Gio.DBus.system.call(
          'org.bluez',
          path,
          'org.freedesktop.DBus.Properties',
          'Get',
          new GLib.Variant('(ss)', ['org.bluez.Adapter1', 'Powered']),
          null,
          Gio.DBusCallFlags.NONE,
          -1,
          null,
          (conn: any, res: any) => {
            try {
              const ret = conn.call_finish(res);
              resolve(ret);
            } catch (e) {
              reject(e);
            }
          }
        );
      });

      const child = result.get_child_value(0);
      return child.get_variant().get_boolean();
    } catch (e) {
      debugLog('[BluetoothAdapter] Failed to get Bluetooth state:', e);
      return false;
    }
  }

  private async _getDevicePath(address: string): Promise<string | null> {
    if (!address) return null;

    return new Promise((resolve) => {
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
            const [objects] = result.deep_unpack();

            const unpack = (val: any) =>
              val instanceof GLib.Variant ? val.deep_unpack() : val;

            for (const objectPath in objects) {
              const ifaces = objects[objectPath];
              if ('org.bluez.Device1' in ifaces) {
                const props = ifaces['org.bluez.Device1'];
                const addr = unpack(props.Address);
                if (addr === address) {
                  resolve(objectPath);
                  return;
                }
              }
            }
            resolve(null);
          } catch (e) {
            resolve(null);
          }
        }
      );
    });
  }

  async connectBluetoothDevice(id: string): Promise<void> {
    debugLog(`[BluetoothAdapter] Connecting to ${id}`);
    const path = await this._getDevicePath(id);
    if (!path) {
      debugLog(`[BluetoothAdapter] Device ${id} not found`);
      return;
    }

    return new Promise((resolve) => {
      Gio.DBus.system.call(
        'org.bluez',
        path,
        'org.bluez.Device1',
        'Connect',
        null,
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
        (conn: any, res: any) => {
          try {
            conn.call_finish(res);
            debugLog(`[BluetoothAdapter] Connected to ${id}`);
          } catch (e) {
            debugLog(`[BluetoothAdapter] Failed to connect to ${id}:`, e);
          }
          resolve();
        }
      );
    });
  }

  async disconnectBluetoothDevice(id: string): Promise<void> {
    debugLog(`[BluetoothAdapter] Disconnecting from ${id}`);
    const path = await this._getDevicePath(id);
    if (!path) return;

    return new Promise((resolve) => {
      Gio.DBus.system.call(
        'org.bluez',
        path,
        'org.bluez.Device1',
        'Disconnect',
        null,
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
        (conn: any, res: any) => {
          try {
            conn.call_finish(res);
            debugLog(`[BluetoothAdapter] Disconnected from ${id}`);
          } catch (e) {
            debugLog(`[BluetoothAdapter] Failed to disconnect ${id}:`, e);
          }
          resolve();
        }
      );
    });
  }

  onBluetoothPowerStateChanged(
    callback: (isEnabled: boolean) => void
  ): () => void {
    if (!this._powerDispatcher) {
      debugLog('[BluetoothAdapter] Creating shared power state dispatcher');
      const subscribeFactory = (
        dispatch: (enabled: boolean) => void
      ): number => {
        return Gio.DBus.system.signal_subscribe(
          'org.bluez',
          'org.freedesktop.DBus.Properties',
          'PropertiesChanged',
          null,
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
                interfaceName === 'org.bluez.Adapter1' &&
                changedProps.Powered !== undefined
              ) {
                const newState = changedProps.Powered.get_boolean();
                debugLog(`[BluetoothAdapter] Bluetooth Powered: ${newState}`);
                dispatch(newState);
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
      this._powerDispatcher = new SignalDispatcher(
        'BT-Power',
        subscribeFactory,
        unsubscribeFactory
      );
    }
    return this._powerDispatcher.addCallback(callback);
  }

  onBluetoothDeviceStateChanged(callback: () => void): () => void {
    if (!this._deviceDispatcher) {
      debugLog('[BluetoothAdapter] Creating shared device state dispatcher');
      const subscribeFactory = (dispatch: () => void): number => {
        return Gio.DBus.system.signal_subscribe(
          'org.bluez',
          'org.freedesktop.DBus.Properties',
          'PropertiesChanged',
          null,
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
                interfaceName === 'org.bluez.Device1' &&
                changedProps.Connected !== undefined
              ) {
                debugLog(`[BluetoothAdapter] Device connection changed`);
                dispatch();
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
      this._deviceDispatcher = new SignalDispatcher(
        'BT-Device',
        subscribeFactory,
        unsubscribeFactory
      );
    }
    return this._deviceDispatcher.addCallback(callback);
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
                      unpackVariant(deviceProps.Name) ||
                      unpackVariant(deviceProps.Alias) ||
                      'Unknown Device';
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

  async getKnownDevices(): Promise<{ name: string; address: string }[]> {
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
                  const paired = unpackVariant(deviceProps.Paired);
                  const trusted = unpackVariant(deviceProps.Trusted);

                  if (paired || trusted) {
                    const name =
                      unpackVariant(deviceProps.Name) ||
                      unpackVariant(deviceProps.Alias) ||
                      'Unknown Device';
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
        debugLog('[BluetoothAdapter] Failed to get known devices:', e);
        resolve([]);
      }
    });
  }
}
