// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
import { BaseEditor } from '../../components/baseEditor.js';

export class IntervalTriggerEditor extends BaseEditor {
  render(group: any): void {
    // Defaults - ensure we always have valid values
    if (!this.config.interval || this.config.interval < 1) {
      this.config.interval = 30; // Default 30 mins
    }
    if (!this.config.unit) this.config.unit = 'minutes';

    // Interval Input with strict bounds
    const adjustment = new Gtk.Adjustment({
      value: Math.max(1, this.config.interval),
      lower: 0, // Allow 0 so we can validate against it (user sees error instead of auto-fix)
      upper: 1000,
      step_increment: 1,
    });

    // Adjustment clamping logic removed to allow user to type "0" or negative
    // and see the validation error instead of auto-correcting.

    const intervalRow = new Adw.SpinRow({
      title: 'Interval',
      subtitle: 'How often to repeat this routine',
      adjustment: adjustment,
      numeric: true, // Only allow numeric input
      climb_rate: 1,
    });

    // We update adjustment based on unit
    const updateAdjustment = () => {
      if (this.config.unit === 'hours') {
        adjustment.upper = 168; // 1 week max
      } else {
        adjustment.upper = 120; // 120 mins max
      }
      // We don't force value down here anymore, validation will catch it if out of bounds
    };

    updateAdjustment();

    // @ts-ignore
    intervalRow.connect('notify::value', () => {
      this.config.interval = intervalRow.value;
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
    // Strict validation - no auto-correction
    // This ensures the user sees the error and cannot proceed if the UI shows an invalid value
    if (
      !this.config.interval ||
      isNaN(this.config.interval) ||
      this.config.interval < 1
    ) {
      return 'Interval must be at least 1 minute';
    }

    return true;
  }
}
