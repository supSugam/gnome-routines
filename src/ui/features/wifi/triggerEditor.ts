// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import NM from 'gi://NM';
import { BaseEditor } from '../../components/baseEditor.js';
import { ConnectionState, WifiTriggerConfig } from '../../../engine/types.js';

export class WifiTriggerEditor extends BaseEditor {
  private get wifiConfig(): WifiTriggerConfig {
    return this.config as WifiTriggerConfig;
  }

  render(group: any): void {
    // Initialize defaults if missing
    if (!this.wifiConfig.state) this.wifiConfig.state = ConnectionState.CONNECTED;
    if (!this.wifiConfig.ssids) this.wifiConfig.ssids = [];

    const wifiModel = new Gtk.StringList({
      strings: ['Connected', 'Disconnected', 'Turned On', 'Turned Off'],
    });

    const states = [
      ConnectionState.CONNECTED,
      ConnectionState.DISCONNECTED,
      ConnectionState.ENABLED,
      ConnectionState.DISABLED,
    ];

    // Default to connected if undefined (already handled above, but specific)
    const currentState = this.wifiConfig.state;
    const selectedIndex = states.indexOf(currentState);

    const wifiRow = new Adw.ComboRow({
      title: 'Trigger when Wifi is',
      model: wifiModel,
      selected: selectedIndex >= 0 ? selectedIndex : 0,
    });
    group.add(wifiRow);

    // Wifi Network Selection
    const wifiNetworksRow = new Adw.ExpanderRow({
      title: 'Specific Networks',
      subtitle: this.getNetworksSubtitle(),
      expanded: this.wifiConfig.ssids.length > 0,
    });
    group.add(wifiNetworksRow);

    const updateVisibilityAndSubtitle = () => {
      const isPowerState = wifiRow.selected >= 2; // 2=enabled, 3=disabled
      wifiNetworksRow.visible = !isPowerState;
      wifiNetworksRow.subtitle = this.getNetworksSubtitle();
    };

    // Hide network selection if checking for power state
    // @ts-ignore
    wifiRow.connect('notify::selected', () => {
      this.wifiConfig.state = states[wifiRow.selected];
      updateVisibilityAndSubtitle();
      this.onChange();
    });

    // Initial sync
    updateVisibilityAndSubtitle();

    this.loadNetworks(wifiNetworksRow);
  }

  private getNetworksSubtitle(): string {
      if (!this.config.ssids || this.config.ssids.length === 0) {
          return 'Leave empty for any network';
      }
      if (this.config.ssids.length === 1) {
          return this.config.ssids[0];
      }
      return `${this.config.ssids.length} networks selected`;
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

    // Use a copy to avoid mutation reference issues if accidentally passed by ref logic elsewhere
    // though here we modify config.ssids in place.
    // Ensure we have set initialized
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
          row.subtitle = this.getNetworksSubtitle(); // Update subtitle on toggle
          this.onChange();
        });
        netRow.add_suffix(check);
        row.add_row(netRow);
      });
    }
  }

  validate(): boolean | string {
    if (!this.wifiConfig.state) return "Invalid state";
    // If specific networks are selected but state is just "Enabled" (Turned On), 
    // we technically ignore them, but it's not "invalid".
    return true;
  }
}
