
// @ts-ignore
import Adw from 'gi://Adw';
import { BaseEditor } from '../../components/baseEditor.js';
import { ExecuteCommandActionConfig } from '../../../engine/types.js';

export class ExecuteCommandEditor extends BaseEditor {
  protected config: ExecuteCommandActionConfig;

  constructor(config: any, onChange: () => void) {
    super(config, onChange);
    this.config = config as ExecuteCommandActionConfig;
  }

  render(group: any): void {
    const row = new Adw.EntryRow({
      title: 'Command',
      text: this.config.command || '',
    });

    // @ts-ignore
    row.connect('notify::text', () => {
      this.config.command = row.text;
      this.onChange();
    });

    group.add(row);
  }

  validate(): boolean | string {
    if (!this.config.command || this.config.command.trim() === '') {
      return 'Command cannot be empty';
    }
    return true;
  }
}
