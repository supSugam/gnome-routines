// @ts-ignore
import Adw from 'gi://Adw';
import { BaseEditor } from '../../components/baseEditor.js';

// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import GLib from 'gi://GLib';
import { ScreenshotActionConfig } from '../../../engine/types.js';

export class ScreenshotActionEditor extends BaseEditor {
  private get screenConfig(): ScreenshotActionConfig {
    return this.config as ScreenshotActionConfig;
  }

  private getDefaultDir(): string {
    const picturesDir = GLib.get_user_special_dir(
      GLib.UserDirectory.DIRECTORY_PICTURES
    );
    return picturesDir
      ? `${picturesDir}/Screenshots`
      : `${GLib.get_home_dir()}/Pictures/Screenshots`;
  }

  render(group: any): void {
    const homeDir = GLib.get_home_dir();
    const prefixPath = homeDir + '/';

    // Set default if empty
    // Default
    if (!this.screenConfig.directory) {
      this.screenConfig.directory = this.getDefaultDir();
    }

    // Relative path
    let relativePath = '';
    if (this.screenConfig.directory.startsWith(prefixPath)) {
      relativePath = this.screenConfig.directory.substring(prefixPath.length);
    } else {
      // Fallback
      const def = this.getDefaultDir();
      this.screenConfig.directory = def;
      relativePath = def.substring(prefixPath.length);
    }

    const pathRow = new Adw.EntryRow({
      title: 'Save Directory (~/)',
      text: relativePath,
    });
    group.add(pathRow);

    // Reset Btn
    const resetButton = new Gtk.Button({
      icon_name: 'edit-undo-symbolic',
      valign: Gtk.Align.CENTER,
      has_frame: false,
      tooltip_text: 'Reset to default directory',
    });
    // @ts-ignore
    resetButton.connect('clicked', () => {
      const def = this.getDefaultDir();
      this.screenConfig.directory = def;
      // Update UI
      pathRow.text = def.substring(prefixPath.length);
      this.onChange();
    });
    pathRow.add_suffix(resetButton);

    // Listener
    // @ts-ignore
    pathRow.connect('changed', () => {
      const relative = pathRow.text;
      this.screenConfig.directory = prefixPath + relative;
      this.onChange();
    });
  }

  validate(): boolean | string {
    const dir = this.screenConfig.directory;
    if (!dir) return 'Directory is required';

    const homeDir = GLib.get_home_dir();
    if (!dir.startsWith(homeDir)) {
      return `Directory must be within ${homeDir}`;
    }

    try {
      if (!GLib.file_test(dir, GLib.FileTest.IS_DIR)) {
        return 'Directory does not exist';
      }
    } catch (e) {
      return 'Invalid directory path';
    }

    return true;
  }
}
