// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
import { BaseEditor } from '../../components/baseEditor.js';

export class ClipboardTriggerEditor extends BaseEditor {
  render(group: any): void {
    const clipboardTypeModel = new Gtk.StringList({
      strings: ['Any Content', 'Text', 'Image', 'Custom Regex'],
    });
    const clipboardTypeRow = new Adw.ComboRow({
      title: 'Content Type',
      model: clipboardTypeModel,
    });
    group.add(clipboardTypeRow);

    const clipboardRegexEntry = new Adw.EntryRow({
      title: 'Regex Pattern',
      text: this.config.regex || '',
    });
    group.add(clipboardRegexEntry);

    // Initialize selection
    const cbTypes = ['any', 'text', 'image', 'regex'];
    if (this.config.contentType && cbTypes.includes(this.config.contentType)) {
      clipboardTypeRow.selected = cbTypes.indexOf(this.config.contentType);
    } else {
      clipboardTypeRow.selected = 0;
    }

    const updateClipboardTriggerUI = () => {
      const isRegex = clipboardTypeRow.selected === 3;
      clipboardRegexEntry.visible = isRegex;
      
      this.config.contentType = cbTypes[clipboardTypeRow.selected];
      this.onChange();
    };
    // @ts-ignore
    clipboardTypeRow.connect('notify::selected', updateClipboardTriggerUI);
    
    // @ts-ignore
    clipboardRegexEntry.connect('changed', () => {
      this.config.regex = clipboardRegexEntry.text;
      this.onChange();
    });
    
    // Initial state
    clipboardRegexEntry.visible = clipboardTypeRow.selected === 3;
  }

  validate(): boolean | string {
    if (this.config.contentType === 'regex' && !this.config.regex) {
      return 'Regex pattern is required';
    }
    return true;
  }
}
