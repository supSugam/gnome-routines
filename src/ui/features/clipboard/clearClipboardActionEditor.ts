// @ts-ignore
import Adw from 'gi://Adw';
import { BaseEditor } from '../../components/baseEditor.js';

export class ClearClipboardActionEditor extends BaseEditor {
  render(group: any): void {
    const row = new Adw.ActionRow({
      title: 'Clear Clipboard',
      subtitle: 'Removes current content from clipboard',
    });
    group.add(row);
  }

  validate(): boolean | string {
    return true;
  }
}
