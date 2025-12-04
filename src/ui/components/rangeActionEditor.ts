// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
import { BaseEditor } from './baseEditor.js';

export abstract class RangeActionEditor extends BaseEditor {
  protected abstract getTitle(): string;
  protected abstract getMin(): number;
  protected abstract getMax(): number;
  protected abstract getStep(): number;
  protected abstract getConfigKey(): string;

  render(group: any): void {
    const row = new Adw.SpinRow({
      title: this.getTitle(),
      adjustment: new Gtk.Adjustment({
        lower: this.getMin(),
        upper: this.getMax(),
        step_increment: this.getStep(),
        value: this.config[this.getConfigKey()] || this.getMin(),
      }),
    });
    group.add(row);

    // @ts-ignore
    row.connect('notify::value', () => {
      this.config[this.getConfigKey()] = row.get_value();
      this.onChange();
    });
  }

  validate(): boolean | string {
    return true;
  }
}
