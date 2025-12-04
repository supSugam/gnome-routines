// @ts-ignore
import Adw from 'gi://Adw';
import { BaseEditor } from '../../components/baseEditor.js';

export class OpenLinkActionEditor extends BaseEditor {
  render(group: any): void {
    const row = new Adw.EntryRow({
      title: 'URL',
      text: this.config.url || '',
    });
    group.add(row);

    // @ts-ignore
    row.connect('changed', () => {
      this.config.url = row.text;
      this.onChange();
    });
  }

  validate(): boolean | string {
    if (!this.config.url) return 'URL is required';
    return true;
  }
}
