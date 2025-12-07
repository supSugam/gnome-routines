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
    if (!this.config.days) {
      this.config.days = [0, 1, 2, 3, 4, 5, 6];
    }

    const repeatRow = new Adw.ActionRow({
      title: 'Repeat',
      subtitle: this.getDaysSummary(this.config.days),
    });
    group.add(repeatRow);

    const daysBox = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 6,
      valign: Gtk.Align.CENTER,
    });

    // Select All Button
    const allBtn = new Gtk.Button({
      icon_name: 'edit-select-all-symbolic',
      tooltip_text: 'Toggle All',
    });
    allBtn.add_css_class('flat');
    
    // @ts-ignore
    allBtn.connect('clicked', () => {
      if (this.config.days.length === 7) {
        this.config.days = [];
      } else {
        this.config.days = [0, 1, 2, 3, 4, 5, 6];
      }
      updateButtons();
    });
    daysBox.append(allBtn);

    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const toggles: any[] = [];

    dayLabels.forEach((label, index) => {
      const btn = new Gtk.ToggleButton({
        label: label,
        active: this.config.days.includes(index),
      });
      btn.add_css_class('circular');
      
      // @ts-ignore
      btn.connect('toggled', () => {
        if (btn.active) {
          if (!this.config.days.includes(index)) this.config.days.push(index);
        } else {
          this.config.days = this.config.days.filter((d: number) => d !== index);
        }
        this.config.days.sort((a: number, b: number) => a - b);
        
        repeatRow.subtitle = this.getDaysSummary(this.config.days);
        this.onChange();
      });
      
      toggles.push(btn);
      daysBox.append(btn);
    });

    const updateButtons = () => {
      toggles.forEach((btn, index) => {
        btn.active = this.config.days.includes(index);
      });
      repeatRow.subtitle = this.getDaysSummary(this.config.days);
      this.onChange();
    };

    repeatRow.add_suffix(daysBox);
  }

  private getDaysSummary(days: number[]): string {
    if (!days || days.length === 0) return 'Never';
    if (days.length === 7) return 'Every Day';
    
    // Check for Weekdays (Mon-Fri: 1,2,3,4,5)
    const isWeekdays = days.length === 5 && 
      !days.includes(0) && !days.includes(6) &&
      [1,2,3,4,5].every(d => days.includes(d));
      
    if (isWeekdays) return 'Weekdays';

    // Check for Weekends (Sun, Sat: 0, 6)
    const isWeekends = days.length === 2 && 
      days.includes(0) && days.includes(6);
      
    if (isWeekends) return 'Weekends';
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(d => dayNames[d]).join(', ');
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
