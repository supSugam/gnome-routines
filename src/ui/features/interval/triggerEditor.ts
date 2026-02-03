// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
import { BaseEditor } from '../../components/baseEditor.js';

export class IntervalTriggerEditor extends BaseEditor {
  render(group: any): void {
    // Defaults
    if (!this.config.interval || this.config.interval < 1) {
      this.config.interval = 30;
    }

    if (!this.config.unit) this.config.unit = 'minutes';

    const intervalRow = new Adw.EntryRow({
      title: 'Interval',
      input_purpose: Gtk.InputPurpose.NUMBER,
    });

    // Init text
    intervalRow.text = String(this.config.interval);

    // Filter input and update config
    // @ts-ignore
    intervalRow.connect('notify::text', () => {
      let text = intervalRow.text;

      // Strict filtering: Remove non-digits immediately
      // This physically prevents alphabetic input
      const filtered = text.replace(/[^0-9]/g, '');

      if (text !== filtered) {
        // Stop recursion
        intervalRow.text = filtered;
        text = filtered;
      }

      const parsed = parseInt(text, 10);

      // Update config
      if (text === '' || isNaN(parsed)) {
        this.config.interval = 0; // Invalid
      } else {
        this.config.interval = parsed;
      }

      this.onChange();
    });

    group.add(intervalRow);

    // Unit
    const unitRow = new Adw.ComboRow({
      title: 'Time Unit',
      model: new Gtk.StringList({
        strings: ['Minutes', 'Hours'],
      }),
      selected: this.config.unit === 'hours' ? 1 : 0,
    });

    // @ts-ignore
    unitRow.connect('notify::selected', () => {
      const newUnit = unitRow.selected === 1 ? 'hours' : 'minutes';

      this.config.unit = newUnit;
      this.onChange();
    });
    group.add(unitRow);

    const helpRow = new Adw.ActionRow({
      title: 'Note',
      subtitle: 'Routines with an Interval trigger cannot have other triggers.',
    });

    group.add(helpRow);

    // Initial trigger
    this.onChange();
  }

  validate(): boolean | string {
    const interval = this.config.interval;
    const unit = this.config.unit || 'minutes';
    const maxValue = unit === 'hours' ? 168 : 120; // 1 week or 2 hours

    if (!interval || isNaN(interval)) {
      return 'Enter a valid number';
    }

    if (interval < 1) {
      return 'Interval must be at least 1';
    }

    if (interval > maxValue) {
      return `Interval cannot exceed ${maxValue} ${unit}`;
    }

    return true;
  }
}
