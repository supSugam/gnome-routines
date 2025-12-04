// @ts-ignore
import Adw from 'gi://Adw';
import { BaseEditor } from '../../components/baseEditor.js';

export class NotificationActionEditor extends BaseEditor {
  render(group: any): void {
    const titleRow = new Adw.EntryRow({
      title: 'Title',
      text: this.config.title || '',
    });
    group.add(titleRow);

    const bodyRow = new Adw.EntryRow({
      title: 'Message',
      text: this.config.body || '',
    });
    group.add(bodyRow);

    // @ts-ignore
    titleRow.connect('changed', () => {
      this.config.title = titleRow.text;
      this.onChange();
    });

    // @ts-ignore
    bodyRow.connect('changed', () => {
      this.config.body = bodyRow.text;
      this.onChange();
    });
  }

  validate(): boolean | string {
    if (!this.config.title) return 'Title is required';
    return true;
  }
}
