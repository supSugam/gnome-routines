// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
import { BaseEditor } from '../../components/baseEditor.js';

import { ActionOperation } from '../../../engine/types.js';
import { BluetoothAdapter } from '../../../gnome/adapters/handlers/bluetooth.js';

export class DisconnectBluetoothActionEditor extends BaseEditor {
  private _adapter = new BluetoothAdapter();

  render(group: any): void {
    const row = new Adw.ExpanderRow({
      title: 'Select Device',
      subtitle:
        this.config.deviceName || this.config.deviceId || 'No device selected',
      expanded: true,
    });

    group.add(row);

    this.loadDevices(row);
  }

  private async loadDevices(row: any) {
    const loadingRow = new Adw.ActionRow({
      title: 'Checking Bluetooth status...',
    });

    row.add_row(loadingRow);

    const isPowered = await this._adapter.getBluetooth();

    if (isPowered) {
      const devices = await this._adapter.getKnownDevices();

      if (loadingRow.get_parent()) row.remove(loadingRow);
      this.renderDeviceList(row, devices, true);
    } else {
      loadingRow.title = 'Turning on Bluetooth to fetch known devices...';
      await this._adapter.setBluetooth(true);
      await new Promise((r) => setTimeout(r, 2000));

      const devices = await this._adapter.getKnownDevices();

      await this._adapter.setBluetooth(false);

      if (loadingRow.get_parent()) row.remove(loadingRow);
      this.renderDeviceList(row, devices, true);
    }
  }

  private renderDeviceList(
    row: any,
    devices: { name: string; address: string }[],
    isPowered: boolean
  ) {
    devices.sort((a, b) => a.name.localeCompare(b.name));

    if (devices.length === 0) {
      const title = isPowered
        ? 'No known devices found'
        : 'No known devices found. Auto-toggle failed.';
      const noDevRow = new Adw.ActionRow({ title });

      row.add_row(noDevRow);
    } else {
      devices.forEach((dev) => {
        const devRow = new Adw.ActionRow({
          title: `${dev.name} (${dev.address})`,
        });
        const check = new Gtk.CheckButton({
          active: this.config.deviceId === dev.address,
          valign: Gtk.Align.CENTER,
        });

        // @ts-ignore
        check.connect('toggled', () => {
          if (check.active) {
            this.config.deviceId = dev.address;
            this.config.deviceName = dev.name;
            this.config.action = ActionOperation.DISCONNECT;
            row.subtitle = dev.name;
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
