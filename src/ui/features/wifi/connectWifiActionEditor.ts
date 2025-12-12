// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import NM from 'gi://NM';
import { BaseEditor } from '../../components/baseEditor.js';

export class ConnectWifiActionEditor extends BaseEditor {
  render(group: any): void {
    const row = new Adw.ExpanderRow({
      title: 'Select Network',
      subtitle: this.config.ssid || 'No network selected',
      expanded: true,
    });
    group.add(row);

    this.loadNetworks(row);
  }

  private loadNetworks(row: any) {
    let availableNetworks: string[] = [];
    try {
      const client = NM.Client.new(null);
      if (client) {
        const connections = client.get_connections();
        for (let i = 0; i < connections.length; i++) {
          const conn = connections[i];
          if (conn.get_connection_type() === '802-11-wireless') {
            const id = conn.get_id();
            if (id && !availableNetworks.includes(id)) {
              availableNetworks.push(id);
            }
          }
        }
        availableNetworks.sort();
      }
    } catch (e) {
      console.error('Failed to load wifi networks:', e);
    }

    if (availableNetworks.length === 0) {
      const noNetRow = new Adw.ActionRow({
        title: 'No saved networks found',
      });
      row.add_row(noNetRow);
      return;
    }

    const checkboxes: Map<string, any> = new Map();

    availableNetworks.forEach((ssid) => {
      const netRow = new Adw.ActionRow({ title: ssid });
      const check = new Gtk.CheckButton({
        active: this.config.ssid === ssid,
        valign: Gtk.Align.CENTER,
      });

      checkboxes.set(ssid, check);

      // @ts-ignore
      check.connect('toggled', () => {
        if (check.active) {
          // Uncheck others
          for (const [s, btn] of checkboxes.entries()) {
            if (s !== ssid) {
              btn.active = false;
            }
          }

          this.config.ssid = ssid;
          row.subtitle = ssid;
        } else {
          // If unchecking current, clear it
          if (this.config.ssid === ssid) {
            this.config.ssid = null;
            row.subtitle = 'No network selected';
          }
        }
        this.onChange();
      });

      netRow.add_suffix(check);
      row.add_row(netRow);
    });
  }

  validate(): boolean | string {
    if (!this.config.ssid) return 'Select a network';
    return true;
  }
}
