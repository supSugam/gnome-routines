// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
import { BaseEditor } from '../../components/baseEditor.js';

export class ScreenOrientationActionEditor extends BaseEditor {
  render(group: any): void {
    const model = new Gtk.StringList({
      strings: ['Normal', 'Right', 'Left', 'Upside Down'],
    });
    const values = ['normal', 'right', 'left', 'upside-down'];

    const row = new Adw.ComboRow({
      title: 'Orientation',
      model: model,
      selected: values.indexOf(this.config.orientation || 'normal'),
    });
    group.add(row);

    // @ts-ignore
    row.connect('notify::selected', () => {
      this.config.orientation = values[row.selected];
      this.onChange();
    });
  }

  validate(): boolean | string {
    return true;
  }
}
