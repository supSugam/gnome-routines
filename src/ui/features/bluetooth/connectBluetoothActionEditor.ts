// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
import { BaseEditor } from '../../components/baseEditor.js';
import { RETRY_DEFAULTS } from '../../../engine/constants.js';
import { ActionOperation } from '../../../engine/types.js';
import { BluetoothAdapter } from '../../../gnome/adapters/handlers/bluetooth.js';

export class ConnectBluetoothActionEditor extends BaseEditor {
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
    this.addRetrySettings(group);
  }

  private addRetrySettings(group: any) {
    // Timeout
    const timeoutRow = new Adw.ActionRow({
      title: 'Wait Timeout (seconds)',
      subtitle: 'Stop trying after this many seconds',
    });
    const timeoutSpin = new Gtk.SpinButton({
      adjustment: new Gtk.Adjustment({
        lower: RETRY_DEFAULTS.TIMEOUT.MIN,
        upper: RETRY_DEFAULTS.TIMEOUT.MAX,
        step_increment: RETRY_DEFAULTS.TIMEOUT.STEP,
        value: this.config.timeout || RETRY_DEFAULTS.TIMEOUT.DEFAULT,
      }),
      valign: Gtk.Align.CENTER,
    });
    // @ts-ignore
    timeoutSpin.connect('value-changed', () => {
      this.config.timeout = timeoutSpin.get_value();
      this.onChange();
    });
    timeoutRow.add_suffix(timeoutSpin);
    group.add(timeoutRow);

    // Interval
    const intervalRow = new Adw.ActionRow({
      title: 'Retry Interval (seconds)',
      subtitle: 'Wait this long between attempts',
    });
    const intervalSpin = new Gtk.SpinButton({
      adjustment: new Gtk.Adjustment({
        lower: RETRY_DEFAULTS.INTERVAL.MIN,
        upper: RETRY_DEFAULTS.INTERVAL.MAX,
        step_increment: RETRY_DEFAULTS.INTERVAL.STEP,
        value: this.config.interval || RETRY_DEFAULTS.INTERVAL.DEFAULT,
      }),
      valign: Gtk.Align.CENTER,
    });
    // @ts-ignore
    intervalSpin.connect('value-changed', () => {
      this.config.interval = intervalSpin.get_value();
      this.onChange();
    });
    intervalRow.add_suffix(intervalSpin);
    group.add(intervalRow);
  }

  private async loadDevices(row: any) {
    const loadingRow = new Adw.ActionRow({
      title: 'Checking Bluetooth status...',
    });
    row.add_row(loadingRow);

    const isPowered = await this._adapter.getBluetooth();

    const updateList = async () => {
      const devices = await this._adapter.getKnownDevices();

      // Cleanup loading
      if (loadingRow.get_parent()) {
        row.remove(loadingRow);
      }

      this.renderDeviceList(row, devices, true);
    };

    if (isPowered) {
      await updateList();
    } else {
      loadingRow.title = 'Turning on Bluetooth to fetch known devices...';
      await this._adapter.setBluetooth(true);

      // Wait
      await new Promise((r) => setTimeout(r, 2000));

      const devices = await this._adapter.getKnownDevices();

      // Disable
      await this._adapter.setBluetooth(false);

      if (loadingRow.get_parent()) {
        row.remove(loadingRow);
      }
      this.renderDeviceList(row, devices, true);
    }
  }

  private renderDeviceList(
    row: any,
    devices: { name: string; address: string }[],
    isPowered: boolean
  ) {
    const checkboxes: Map<string, any> = new Map();

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

        checkboxes.set(dev.address, check);

        // @ts-ignore
        check.connect('toggled', () => {
          if (check.active) {
            // Single selection
            for (const [addr, btn] of checkboxes.entries()) {
              if (addr !== dev.address) {
                btn.active = false;
              }
            }

            this.config.deviceId = dev.address;
            this.config.deviceName = dev.name;
            this.config.action = ActionOperation.CONNECT;
            row.subtitle = dev.name;
          } else {
            // Clear selection
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
    if (
      (this.config.interval || RETRY_DEFAULTS.INTERVAL.DEFAULT) >
      (this.config.timeout || RETRY_DEFAULTS.TIMEOUT.DEFAULT)
    ) {
      return 'Retry interval cannot be longer than timeout';
    }
    return true;
  }
}
