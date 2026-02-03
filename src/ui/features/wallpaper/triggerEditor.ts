// @ts-ignore
import Adw from 'gi://Adw';
import { BaseEditor } from '../../components/baseEditor.js';

export class WallpaperTriggerEditor extends BaseEditor {
  render(group: any): void {
    const infoRow = new Adw.ActionRow({
      title: 'Wallpaper Change',
      subtitle: 'This trigger fires when the desktop wallpaper is changed.',
    });

    group.add(infoRow);
  }

  validate(): boolean | string {
    // No configuration needed - always valid
    return true;
  }
}
