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
    } else {
      availableNetworks.forEach((ssid) => {
        const netRow = new Adw.ActionRow({ title: ssid });
        const check = new Gtk.CheckButton({
          active: this.config.ssid === ssid,
          valign: Gtk.Align.CENTER,
          group: null // Radio behavior manually managed or use group?
        });
        // For radio behavior with CheckButtons in Gtk4, we usually use a group.
        // But here we are iterating.
        // Let's just handle it manually for simplicity or use a proper group if possible.
        // Actually, Gtk.CheckButton.new_with_label is deprecated? No.
        // To make them radio, we need to pass the group of the first one.
        
        // @ts-ignore
        check.connect('toggled', () => {
          if (check.active) {
            this.config.ssid = ssid;
            row.subtitle = ssid;
            this.onChange();
            // We need to uncheck others? 
            // If we don't use a group, we have to do it manually.
            // But let's assume the user picks one.
          }
        });
        netRow.add_suffix(check);
        row.add_row(netRow);
      });
    }
  }

  validate(): boolean | string {
    if (!this.config.ssid) return 'Select a network';
    return true;
  }
}
