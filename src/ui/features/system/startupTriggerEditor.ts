
// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
import { BaseEditor } from '../../components/baseEditor.js';
import { StartupTriggerConfig } from '../../../engine/types.js';

export class StartupTriggerEditor extends BaseEditor {
  protected config: StartupTriggerConfig;

  constructor(config: any, onChange: () => void) {
    super(config, onChange);
    this.config = config as StartupTriggerConfig;
  }

  render(group: any): void {
    const row = new Adw.ActionRow({
      title: 'Info',
      subtitle: 'This routine will run once when you log in.',
    });
    
    // Add an icon for visual feedback
    const icon = new Gtk.Image({
      icon_name: 'system-log-out-symbolic', // or something indicating startup/session
    });
    row.add_prefix(icon);

    group.add(row);
  }

  validate(): boolean | string {
    return true; // Always valid, no config needed
  }
}
