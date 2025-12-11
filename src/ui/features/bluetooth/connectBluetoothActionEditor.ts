// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import GLib from 'gi://GLib';
import { BaseEditor } from '../../components/baseEditor.js';

export class ConnectBluetoothActionEditor extends BaseEditor {
  render(group: any): void {
    const row = new Adw.ExpanderRow({
      title: 'Select Device',
      subtitle: this.config.deviceId || 'No device selected',
      expanded: true,
    });
    group.add(row);

    this.loadDevices(row);
  }

  private loadDevices(row: any) {
    const loadingRow = new Adw.ActionRow({
      title: 'Checking Bluetooth status...',
    });
    row.add_row(loadingRow);

    const unpack = (val: any) => {
      if (val instanceof GLib.Variant) return val.deep_unpack();
      return val;
    };

    const fetchObjects = (callback: (objects: any) => void) => {
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
            callback(objects);
          } catch (e) {
            console.error('Failed to fetch bluetooth objects:', e);
            callback({});
          }
        }
      );
    };

    const togglePower = (on: boolean, callback: () => void) => {
      let cmd = '';
      if (on) {
        // Unblock RFKill first, then power on
        cmd =
          '/usr/sbin/rfkill unblock bluetooth && /usr/bin/bluetoothctl power on';
      } else {
        cmd = '/usr/bin/bluetoothctl power off';
      }

      try {
        const [, pid] = GLib.spawn_async(
          null,
          ['/bin/sh', '-c', cmd],
          null,
          GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
          null
        );

        // Allow some time for the command to effect change
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
          GLib.spawn_close_pid(pid);
          callback();
          return GLib.SOURCE_REMOVE;
        });
      } catch (e) {
        console.error(`Failed to toggle bluetooth ${on ? 'on' : 'off'}:`, e);
        callback();
      }
    };

    fetchObjects((objects) => {
      let adapterPath = null;
      let isPowered = false;

      for (const path in objects) {
        if ('org.bluez.Adapter1' in objects[path]) {
          adapterPath = path;
          const props = objects[path]['org.bluez.Adapter1'];
          if (props['Powered']) {
            isPowered = unpack(props['Powered']);
          }
          break;
        }
      }

      // Fallback if no adapter found (e.g. if BlueZ is acting up or interface missing when off)
      if (!adapterPath) {
        adapterPath = '/org/bluez/hci0';
      }

      // If we found the adapter but it's OFF, trigger auto-toggle.
      // We trust isPowered from the object scan. If we didn't find the object, isPowered is false,
      // so we will try to turn on the fallback path.
      if (isPowered) {
        row.remove(loadingRow);
        this.renderDeviceList(row, objects, isPowered);
      } else {
        loadingRow.title = 'Turning on Bluetooth to fetch known devices...';
        // Use CLI to force power on, as it handles default controller automatically
        togglePower(true, () => {
          // Wait for discovery to be useful (2.5s)
          GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2500, () => {
            fetchObjects((newObjects) => {
              // Turn it back off
              togglePower(false, () => {
                row.remove(loadingRow);
                this.renderDeviceList(row, newObjects, true);
              });
            });
            return GLib.SOURCE_REMOVE;
          });
        });
      }
    });
  }

  private renderDeviceList(row: any, objects: any, isPowered: boolean) {
    const devices: { alias: string; address: string }[] = [];
    const checkboxes: Map<string, any> = new Map();

    const unpack = (val: any) => {
      if (val instanceof GLib.Variant) return val.deep_unpack();
      return val;
    };

    for (const objectPath in objects) {
      const interfaces = objects[objectPath];
      if ('org.bluez.Device1' in interfaces) {
        const props = interfaces['org.bluez.Device1'];
        const paired = props['Paired'] ? unpack(props['Paired']) : false;
        const trusted = props['Trusted'] ? unpack(props['Trusted']) : false;

        if (paired || trusted) {
          const name = props['Name'] ? unpack(props['Name']) : null;
          const alias = props['Alias'] ? unpack(props['Alias']) : null;
          const address = props['Address'] ? unpack(props['Address']) : null;
          const display = alias || name || address || 'Unknown Device';
          devices.push({ alias: display, address: address });
        }
      }
    }

    devices.sort((a, b) => a.alias.localeCompare(b.alias));

    if (devices.length === 0) {
      const title = isPowered
        ? 'No known devices found'
        : 'No known devices found. Auto-toggle failed.';
      const noDevRow = new Adw.ActionRow({ title });
      row.add_row(noDevRow);
    } else {
      devices.forEach((dev) => {
        const devRow = new Adw.ActionRow({
          title: `${dev.alias} (${dev.address})`,
        });
        const check = new Gtk.CheckButton({
          active: this.config.deviceId === dev.address,
          valign: Gtk.Align.CENTER,
        });

        checkboxes.set(dev.address, check);

        // @ts-ignore
        check.connect('toggled', () => {
          if (check.active) {
            // Uncheck others
            for (const [addr, btn] of checkboxes.entries()) {
              if (addr !== dev.address) {
                btn.active = false;
              }
            }

            this.config.deviceId = dev.address;
            this.config.action = 'connect';
            row.subtitle = dev.alias;
          } else {
            // If we are unchecking the CURRENTLY selected device, clear it
            if (this.config.deviceId === dev.address) {
              this.config.deviceId = null;
              this.config.action = null;
              row.subtitle = 'No device selected';
            }
          }
          this.onChange();
        });
        devRow.add_suffix(check);
        row.add_row(devRow);
      });
    }
  }

  validate(): boolean | string {
    if (!this.config.deviceId) return 'Select a device';
    return true;
  }
}
