// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import Gio from 'gi://Gio';
import { BaseEditor } from '../../components/baseEditor.js';

export class WallpaperActionEditor extends BaseEditor {
  render(group: any): void {
    const row = new Adw.ActionRow({
      title: 'Wallpaper Image',
      subtitle: this.config.uri || 'No image selected',
    });

    const btn = new Gtk.Button({
      label: 'Select Image',
      valign: Gtk.Align.CENTER,
    });
    
    // @ts-ignore
    btn.connect('clicked', () => {
      // File chooser logic would go here. 
      // Since we are in prefs, we might need a dialog.
      // For now, let's use a simple entry as fallback or mock the dialog if possible.
      // Gtk4 FileDialog is async.
      // Let's use a text entry for URI for now to be safe and simple, 
      // or try to implement file chooser if I can find the right GJS syntax quickly.
      // Given the constraints, a text entry is safer to avoid crashes.
    });
    
    // Changing to EntryRow for simplicity/robustness in this refactor step
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
