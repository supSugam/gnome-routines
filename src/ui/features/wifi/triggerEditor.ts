// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import NM from 'gi://NM';
import { BaseEditor } from '../../components/baseEditor.js';

export class WifiTriggerEditor extends BaseEditor {
  render(group: any): void {
    const wifiModel = new Gtk.StringList({
      strings: ['Connected', 'Disconnected', 'Turned On', 'Turned Off'],
    });
    
    const selectedIndex = ['connected', 'disconnected', 'enabled', 'disabled'].indexOf(
      this.config.state || 'connected'
    );

    const wifiRow = new Adw.ComboRow({
      title: 'Trigger when Wifi is',
      model: wifiModel,
      selected: selectedIndex >= 0 ? selectedIndex : 0,
    });
    group.add(wifiRow);

    // Wifi Network Selection
    const wifiNetworksRow = new Adw.ExpanderRow({
      title: 'Specific Networks',
      subtitle: 'Leave empty for any network',
      expanded: true,
    });
    group.add(wifiNetworksRow);

    // Hide network selection if checking for power state
    // @ts-ignore
    wifiRow.connect('notify::selected', () => {
      const isPowerState = wifiRow.selected >= 2; // 2=enabled, 3=disabled
      wifiNetworksRow.visible = !isPowerState;
      
      const states = ['connected', 'disconnected', 'enabled', 'disabled'];
      this.config.state = states[wifiRow.selected];
      this.onChange();
    });
    // Initial visibility check
    wifiNetworksRow.visible = wifiRow.selected < 2;

    this.loadNetworks(wifiNetworksRow);
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
      console.error('Failed to load wifi networks in prefs:', e);
    }

    const selectedNetworks = new Set<string>(this.config.ssids || []);

    if (availableNetworks.length === 0) {
      const noNetRow = new Adw.ActionRow({
        title: 'No saved networks found',
      });
      row.add_row(noNetRow);
    } else {
      availableNetworks.forEach((ssid) => {
        const netRow = new Adw.ActionRow({ title: ssid });
        const check = new Gtk.CheckButton({
          active: selectedNetworks.has(ssid),
          valign: Gtk.Align.CENTER,
        });
        // @ts-ignore
        check.connect('toggled', () => {
          if (check.active) selectedNetworks.add(ssid);
          else selectedNetworks.delete(ssid);
          
          this.config.ssids = Array.from(selectedNetworks);
          this.onChange();
        });
        netRow.add_suffix(check);
        row.add_row(netRow);
      });
    }
  }

  validate(): boolean | string {
    return true;
  }
}
