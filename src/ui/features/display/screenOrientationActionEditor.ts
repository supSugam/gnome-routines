// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
import { BaseEditor } from '../../components/baseEditor.js';
import {
  ScreenOrientation,
  ScreenOrientationActionConfig,
} from '../../../engine/types.js';

export class ScreenOrientationActionEditor extends BaseEditor {
  private get orientationConfig(): ScreenOrientationActionConfig {
    return this.config as ScreenOrientationActionConfig;
  }

  render(group: any): void {
    const model = new Gtk.StringList({
      strings: ['Normal', 'Right', 'Left', 'Upside Down'],
    });
    const values = [
      ScreenOrientation.NORMAL,
      ScreenOrientation.RIGHT,
      ScreenOrientation.LEFT,
      ScreenOrientation.UPSIDE_DOWN,
    ];

    const current =
      this.orientationConfig.orientation || ScreenOrientation.NORMAL;
    const selected = values.indexOf(current);

    const row = new Adw.ComboRow({
      title: 'Orientation',
      model: model,
      selected: selected >= 0 ? selected : 0,
    });
    group.add(row);

    // @ts-ignore
    row.connect('notify::selected', () => {
      this.orientationConfig.orientation = values[row.selected];
      this.onChange();
    });
  }

  validate(): boolean | string {
    return true;
  }
}
