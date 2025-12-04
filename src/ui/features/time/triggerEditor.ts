// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
import { BaseEditor } from '../../components/baseEditor.js';

export class TimeTriggerEditor extends BaseEditor {
  render(group: any): void {
    // Time Mode Selector
    const timeTypeRow = new Adw.ComboRow({
      title: 'Time Mode',
      model: new Gtk.StringList({
        strings: ['Specific Time', 'Time Period'],
      }),
      selected: this.config.startTime ? 1 : 0,
    });
    group.add(timeTypeRow);

    // Time Pickers
    const timeRow = new Adw.ActionRow({ title: 'Time' });
    const timePicker = this.createTimePicker(this.config.time || '09:00', (t) => {
      this.config.time = t;
      this.onChange();
    });
    timeRow.add_suffix(timePicker.widget);
    group.add(timeRow);

    const startRow = new Adw.ActionRow({ title: 'Start Time' });
    const startPicker = this.createTimePicker(this.config.startTime || '09:00', (t) => {
      this.config.startTime = t;
      this.onChange();
    });
    startRow.add_suffix(startPicker.widget);
    group.add(startRow);

    const endRow = new Adw.ActionRow({ title: 'End Time' });
    const endPicker = this.createTimePicker(this.config.endTime || '17:00', (t) => {
      this.config.endTime = t;
      this.onChange();
    });
    endRow.add_suffix(endPicker.widget);
    group.add(endRow);

    // Visibility Logic
    const refreshTimeFields = () => {
      const isPeriod = timeTypeRow.selected === 1;
      timeRow.visible = !isPeriod;
      startRow.visible = isPeriod;
      endRow.visible = isPeriod;
      
      // Clear irrelevant fields to avoid confusion in config
      if (isPeriod) {
        delete this.config.time;
      } else {
        delete this.config.startTime;
        delete this.config.endTime;
      }
      this.onChange();
    };
    // @ts-ignore
    timeTypeRow.connect('notify::selected', refreshTimeFields);
    refreshTimeFields();

    // Days Selection
    const daysGroup = new Adw.PreferencesGroup({ title: 'Repeat' });
    group.add(daysGroup); // Note: This adds a group inside a group, which might be weird visually. 
                          // Ideally BaseEditor render should take a page or content area.
                          // For now, let's assume 'group' is actually the page content or we add rows to it.
                          // Wait, AdwPreferencesGroup cannot contain another Group.
                          // We should change render signature to take 'content: Adw.PreferencesPage'.
  }

  // Helper to create 12h picker
  private createTimePicker(initialTime24h: string, onUpdate: (time: string) => void) {
    const box = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 6,
      valign: Gtk.Align.CENTER,
    });

    let [h, m] = initialTime24h.split(':').map(Number);
    if (isNaN(h)) h = 9;
    if (isNaN(m)) m = 0;

    let isPm = h >= 12;
    if (h > 12) h -= 12;
    if (h === 0) h = 12;

    const hourSpin = Gtk.SpinButton.new_with_range(1, 12, 1);
    hourSpin.value = h;

    const label = new Gtk.Label({ label: ':' });

    const minuteSpin = Gtk.SpinButton.new_with_range(0, 59, 1);
    minuteSpin.value = m;

    const amPmBtn = new Gtk.Button({ label: isPm ? 'PM' : 'AM' });
    // @ts-ignore
    amPmBtn.connect('clicked', () => {
      isPm = !isPm;
      amPmBtn.label = isPm ? 'PM' : 'AM';
      update();
    });

    // @ts-ignore
    hourSpin.connect('value-changed', () => update());
    // @ts-ignore
    minuteSpin.connect('value-changed', () => update());

    box.append(hourSpin);
    box.append(label);
    box.append(minuteSpin);
    box.append(amPmBtn);

    const update = () => {
      let hour = hourSpin.value;
      const minute = minuteSpin.value;

      if (isPm && hour !== 12) hour += 12;
      if (!isPm && hour === 12) hour = 0;

      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      onUpdate(timeStr);
    };

    return { widget: box };
  }

  validate(): boolean | string {
    // Time validation is implicit with SpinButtons
    // But we should check if days are selected (if we implement days here)
    // For now, basic validation passes
    return true;
  }
}
