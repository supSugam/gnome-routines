// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import GLib from 'gi://GLib';
import { BaseEditor } from '../../components/baseEditor.js';

export class BluetoothTriggerEditor extends BaseEditor {
  render(group: any): void {
    const btModel = new Gtk.StringList({
      strings: ['Connected', 'Disconnected', 'Turned On', 'Turned Off'],
    });
    
    const selectedIndex = ['connected', 'disconnected', 'enabled', 'disabled'].indexOf(
      this.config.state || 'connected'
    );

    const btRow = new Adw.ComboRow({
      title: 'Trigger when Bluetooth is',
      model: btModel,
      selected: selectedIndex >= 0 ? selectedIndex : 0,
    });
    group.add(btRow);

    const btDevicesRow = new Adw.ExpanderRow({
      title: 'Specific Devices',
      subtitle: 'Leave empty for any device',
      expanded: true,
    });
    group.add(btDevicesRow);

    // Hide device selection if checking for power state
    // @ts-ignore
    btRow.connect('notify::selected', () => {
      const isPowerState = btRow.selected >= 2;
      btDevicesRow.visible = !isPowerState;
      
      const states = ['connected', 'disconnected', 'enabled', 'disabled'];
      this.config.state = states[btRow.selected];
      this.onChange();
    });
    btDevicesRow.visible = btRow.selected < 2;

    this.loadDevices(btDevicesRow);
  }

  private loadDevices(row: any) {
    let availableDevices: string[] = [];
    try {
      // Use bluetoothctl devices to list known devices
      const [success, stdout] = GLib.spawn_command_line_sync(
        '/usr/bin/bluetoothctl devices'
      );
      if (success && stdout) {
        const output = new TextDecoder().decode(stdout);
        output.split('\n').forEach((line) => {
          const match = line.match(/^Device\s+([0-9A-F:]+)\s+(.+)$/i);
          if (match) {
            availableDevices.push(match[2]);
          }
        });
        availableDevices.sort();
      }
    } catch (e) {
      console.error('Failed to load bluetooth devices:', e);
    }

    const selectedDevices = new Set<string>(this.config.deviceIds || []);

    if (availableDevices.length === 0) {
      const noDevRow = new Adw.ActionRow({
        title: 'No known devices found',
      });
      row.add_row(noDevRow);
    } else {
      availableDevices.forEach((name) => {
        const devRow = new Adw.ActionRow({ title: name });
        const check = new Gtk.CheckButton({
          active: selectedDevices.has(name),
          valign: Gtk.Align.CENTER,
        });
        // @ts-ignore
        check.connect('toggled', () => {
          if (check.active) selectedDevices.add(name);
          else selectedDevices.delete(name);
          
          this.config.deviceIds = Array.from(selectedDevices);
          this.onChange();
        });
        devRow.add_suffix(check);
        row.add_row(devRow);
      });
    }
  }

  validate(): boolean | string {
    return true;
  }
}
