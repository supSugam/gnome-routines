// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import GLib from 'gi://GLib';
import { BaseEditor } from '../../components/baseEditor.js';
import {
  ConnectionState,
  BluetoothTriggerConfig,
} from '../../../engine/types.js';
import debugLog from '../../../utils/log.js';
import { BluetoothAdapter } from '../../../gnome/adapters/handlers/bluetooth.js';

export class BluetoothTriggerEditor extends BaseEditor {
  private _adapter = new BluetoothAdapter();

  private get btConfig(): BluetoothTriggerConfig {
    return this.config as BluetoothTriggerConfig;
  }

  render(group: any): void {
    const btModel = new Gtk.StringList({
      strings: ['Connected', 'Disconnected', 'Turned On', 'Turned Off'],
    });

    const states = [
      ConnectionState.CONNECTED,
      ConnectionState.DISCONNECTED,
      ConnectionState.ENABLED,
      ConnectionState.DISABLED,
    ];

    if (!this.btConfig.state) {
      this.btConfig.state = ConnectionState.CONNECTED;
    }

    const currentState = this.btConfig.state;
    const selectedIndex = states.indexOf(currentState);

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

      this.btConfig.state = states[btRow.selected];
      this.onChange();
    });
    btDevicesRow.visible = btRow.selected < 2;

    this.loadDevices(btDevicesRow);
  }

  private async loadDevices(row: any) {
    let availableDevices: { name: string; address: string }[] = [];
    try {
      availableDevices = await this._adapter.getKnownDevices();
      availableDevices.sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
      debugLog('Failed to load bluetooth devices:', e);
    }

    const selectedDevices = new Set<string>(this.config.deviceIds || []);

    if (availableDevices.length === 0) {
      const noDevRow = new Adw.ActionRow({
        title: 'No known devices found',
      });
      row.add_row(noDevRow);
    } else {
      availableDevices.forEach((dev) => {
        const devRow = new Adw.ActionRow({ title: dev.name });
        // Use name as identifier to maintain compatibility with legacy data
        const identifier = dev.name;

        const check = new Gtk.CheckButton({
          active: selectedDevices.has(identifier),
          valign: Gtk.Align.CENTER,
        });

        // @ts-ignore
        check.connect('toggled', () => {
          if (check.active) selectedDevices.add(identifier);
          else selectedDevices.delete(identifier);

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
