// @ts-ignore
import Adw from 'gi://Adw';
import { BaseEditor } from '../../components/baseEditor.js';

export class ScreenshotActionEditor extends BaseEditor {
  render(group: any): void {
    const row = new Adw.ActionRow({
      title: 'Take Screenshot',
      subtitle: 'Captures the entire screen',
    });
    group.add(row);
  }

  validate(): boolean | string {
    return true;
  }
}
