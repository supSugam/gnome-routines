// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import Gio from 'gi://Gio';
import { BaseEditor } from '../../components/baseEditor.js';

export class WallpaperActionEditor extends BaseEditor {
  render(group: any): void {
    // File chooser fallback
    const entryRow = new Adw.EntryRow({
      title: 'Image Path/URI',
      text: this.config.uri || '',
    });

    group.add(entryRow);

    // @ts-ignore
    entryRow.connect('changed', () => {
      this.config.uri = entryRow.text;
      this.onChange();
    });
  }

  validate(): boolean | string {
    if (!this.config.uri) return 'Image URI is required';

    return true;
  }
}
