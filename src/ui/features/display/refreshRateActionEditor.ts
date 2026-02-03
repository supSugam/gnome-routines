// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import GObject from 'gi://GObject';

import { BaseEditor } from '../../components/baseEditor.js';
import { DisplayAdapter } from '../../../gnome/adapters/handlers/display.js';
import debugLog from '../../../utils/log.js';

export class RefreshRateActionEditor extends BaseEditor {
  private _rates: number[] = [];
  private _combo: any;
  private _spinner: any;
  private _adapter: DisplayAdapter;

  constructor(config: any, onChange: () => void) {
    super(config, onChange);
    this._adapter = new DisplayAdapter();

    if (!this.config.rate) {
      this.config.rate = 60; // Default
    }
  }

  render(container: any) {
    const row = new Adw.ActionRow({
      title: 'Refresh Rate',
      subtitle: 'Select the target refresh rate for your display',
    });

    this._spinner = new Gtk.Spinner();
    this._spinner.valign = Gtk.Align.CENTER;
    row.add_suffix(this._spinner);

    // Loading model
    const model = new Gtk.StringList({
      strings: ['Loading...'],
    });

    this._combo = new Gtk.DropDown({
      model: model,
      valign: Gtk.Align.CENTER,
      sensitive: false, // Disabled until loaded
    });

    row.add_suffix(this._combo);
    container.add(row);

    this.loadRates();
  }

  private async loadRates() {
    this._spinner.start();

    try {
      this._rates = await this._adapter.getAvailableRefreshRates();
      debugLog(
        `[RefreshRateEditor] Loaded rates: ${JSON.stringify(this._rates)}`
      );
    } catch (e) {
      debugLog('[RefreshRateEditor] Failed to load rates:', e);
      this._rates = [60];
    } finally {
      this._spinner.stop();
      this._spinner.visible = false;
      this.updateCombo();
    }
  }

  private updateCombo() {
    if (!this._rates || this._rates.length === 0) {
      this._rates = [60];
    }

    const strings = this._rates.map((r) => `${r} Hz`);
    const model = new Gtk.StringList({
      strings: strings,
    });

    this._combo.model = model;
    this._combo.sensitive = true;

    // Set selection based on config
    const currentRate = this.config.rate;
    const index = this._rates.indexOf(currentRate);

    if (index >= 0) {
      this._combo.selected = index;
    } else {
      // Fallback selection
      if (this._rates.length > 0) {
        this._combo.selected = 0;
        this.config.rate = this._rates[0];
        this.onChange();
      }
    }

    // Listen
    // @ts-ignore
    this._combo.connect('notify::selected', () => {
      const selectedIndex = this._combo.selected;

      if (selectedIndex >= 0 && selectedIndex < this._rates.length) {
        this.config.rate = this._rates[selectedIndex];
        debugLog(`[RefreshRateEditor] Selected rate: ${this.config.rate}`);
        this.onChange();
      }
    });
  }

  validate(): boolean | string {
    return typeof this.config.rate === 'number';
  }
}
