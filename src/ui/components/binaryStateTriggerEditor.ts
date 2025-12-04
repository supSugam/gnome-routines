// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
import { BaseEditor } from './baseEditor.js';

export abstract class BinaryStateTriggerEditor extends BaseEditor {
  protected abstract getTitle(): string;
  protected abstract getTrueLabel(): string;
  protected abstract getFalseLabel(): string;
  protected abstract getTrueValue(): string;
  protected abstract getFalseValue(): string;

  render(group: any): void {
    const model = new Gtk.StringList({
      strings: [this.getTrueLabel(), this.getFalseLabel()],
    });

    const row = new Adw.ComboRow({
      title: this.getTitle(),
      model: model,
      selected: this.config.state === this.getFalseValue() ? 1 : 0,
    });
    group.add(row);

    // @ts-ignore
    row.connect('notify::selected', () => {
      this.config.state = row.selected === 0 ? this.getTrueValue() : this.getFalseValue();
      this.onChange();
    });
  }

  validate(): boolean | string {
    return true;
  }
}
