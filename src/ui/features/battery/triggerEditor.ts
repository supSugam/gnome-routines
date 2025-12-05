// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
import { BaseEditor } from '../../components/baseEditor.js';
import {
  BatteryTriggerConfig,
  BatteryTriggerMode,
  BatteryStatus,
  LevelComparison,
} from '../../../engine/types.js';

export class BatteryTriggerEditor extends BaseEditor {
  private get batteryConfig(): BatteryTriggerConfig {
    return this.config as BatteryTriggerConfig;
  }

  render(group: any): void {
    const battModeModel = new Gtk.StringList({
      strings: ['Charging Status', 'Battery Level'],
    });
    const battModeRow = new Adw.ComboRow({
      title: 'Trigger Type',
      model: battModeModel,
      selected: this.batteryConfig.mode === BatteryTriggerMode.LEVEL ? 1 : 0,
    });
    group.add(battModeRow);

    // Status UI
    const battStatusModel = new Gtk.StringList({
      strings: ['Charging', 'Discharging'],
    });
    const battStatusRow = new Adw.ComboRow({
      title: 'Status',
      model: battStatusModel,
      selected: this.batteryConfig.status === BatteryStatus.DISCHARGING ? 1 : 0,
    });
    group.add(battStatusRow);

    // Level UI
    const battLevelTypeModel = new Gtk.StringList({
      strings: ['Below', 'Equal or Above'],
    });
    const battLevelTypeRow = new Adw.ComboRow({
      title: 'Condition',
      model: battLevelTypeModel,
      selected: this.batteryConfig.levelType === LevelComparison.ABOVE ? 1 : 0,
    });
    group.add(battLevelTypeRow);

    const battLevelRow = new Adw.SpinRow({
      title: 'Battery Percentage',
      adjustment: new Gtk.Adjustment({
        lower: 5,
        upper: 100,
        step_increment: 5,
        value: this.batteryConfig.level || 50,
      }),
    });
    group.add(battLevelRow);

    // Visibility logic for Battery
    const updateBattVisibility = () => {
      const isLevel = battModeRow.selected === 1;
      battStatusRow.visible = !isLevel;
      battLevelTypeRow.visible = isLevel;
      battLevelRow.visible = isLevel;

      this.batteryConfig.mode = isLevel
        ? BatteryTriggerMode.LEVEL
        : BatteryTriggerMode.STATUS;
      this.onChange();
    };
    // @ts-ignore
    battModeRow.connect('notify::selected', updateBattVisibility);
    updateBattVisibility();

    // @ts-ignore
    battStatusRow.connect('notify::selected', () => {
      this.batteryConfig.status =
        battStatusRow.selected === 0
          ? BatteryStatus.CHARGING
          : BatteryStatus.DISCHARGING;
      this.onChange();
    });

    // @ts-ignore
    battLevelTypeRow.connect('notify::selected', () => {
      this.batteryConfig.levelType =
        battLevelTypeRow.selected === 0
          ? LevelComparison.BELOW
          : LevelComparison.ABOVE;
      this.onChange();
    });

    // @ts-ignore
    battLevelRow.connect('notify::value', () => {
      this.batteryConfig.level = battLevelRow.get_value();
      this.onChange();
    });
  }

  validate(): boolean | string {
    return true;
  }
}
