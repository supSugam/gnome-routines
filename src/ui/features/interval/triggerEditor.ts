// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
import { BaseEditor } from '../../components/baseEditor.js';

export class IntervalTriggerEditor extends BaseEditor {
  render(group: any): void {
    // Defaults
    if (!this.config.interval) this.config.interval = 30; // Default 30 mins
    if (!this.config.unit) this.config.unit = 'minutes';

    // Interval Input
    const intervalRow = new Adw.SpinRow({
      title: 'Interval',
      subtitle: 'How often to repeat this routine',
      adjustment: new Gtk.Adjustment({
        value: this.config.interval,
        lower: 1,
        upper: 24, // Assuming hours? Or 60 mins? Dynamic depending on unit would be nice.
        step_increment: 1,
      }),
    });
    
    // We update adjustment based on unit
    const updateAdjustment = () => {
      if (this.config.unit === 'hours') {
        intervalRow.adjustment.upper = 168; // 1 week max
      } else {
        intervalRow.adjustment.upper = 120; // 120 mins max
      }
    };
    updateAdjustment();

    // @ts-ignore
    intervalRow.connect('notify::value', () => {
      let val = intervalRow.value;
      if (val < 1) {
        val = 1;
        // Force update UI if it was somehow 0
        intervalRow.value = 1;
      }
      this.config.interval = val;
      this.onChange();
    });

    group.add(intervalRow);

    // Unit Selector
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
      updateAdjustment();
      this.onChange();
    });
    group.add(unitRow);

    const helpRow = new Adw.ActionRow({
      title: 'Note',
      subtitle: 'Routines with an Interval trigger cannot have other triggers.',
    });
    group.add(helpRow);
  }

  validate(): boolean | string {
    if (!this.config.interval || this.config.interval <= 0) {
      return 'Interval must be greater than 0';
    }
    return true;
  }
}
