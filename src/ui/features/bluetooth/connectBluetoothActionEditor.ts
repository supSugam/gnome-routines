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
    let availableDevices: string[] = [];
    try {
      const [success, stdout] = GLib.spawn_command_line_sync(
        '/usr/bin/bluetoothctl devices'
      );
      if (success && stdout) {
        const output = new TextDecoder().decode(stdout);
        output.split('\n').forEach((line) => {
          const match = line.match(/^Device\s+([0-9A-F:]+)\s+(.+)$/i);
          if (match) {
            availableDevices.push(match[2]); // Using name for display/config? 
            // Trigger used ID? No, Trigger used Name in UI but ID in config?
            // Trigger: availableDevices.push(match[2]); (Name)
            // Trigger config: deviceIds (Set of names?)
            // Let's stick to names as IDs for now as per Trigger implementation.
          }
        });
        availableDevices.sort();
      }
    } catch (e) {
      console.error('Failed to load bluetooth devices:', e);
    }

    if (availableDevices.length === 0) {
      const noDevRow = new Adw.ActionRow({
        title: 'No known devices found',
      });
      row.add_row(noDevRow);
    } else {
      availableDevices.forEach((name) => {
        const devRow = new Adw.ActionRow({ title: name });
        const check = new Gtk.CheckButton({
          active: this.config.deviceId === name,
          valign: Gtk.Align.CENTER,
        });
        // @ts-ignore
        check.connect('toggled', () => {
          if (check.active) {
            this.config.deviceId = name;
            this.config.action = 'connect';
            row.subtitle = name;
            this.onChange();
          }
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
