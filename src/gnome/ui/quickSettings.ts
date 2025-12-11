import GObject from 'gi://GObject';
import St from 'gi://St';
// @ts-ignore
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
// @ts-ignore
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import debugLog from '../../utils/log.js';

const RoutineQuickSettingsItem = GObject.registerClass(
  class RoutineQuickSettingsItem extends QuickSettings.QuickSettingsItem {
    private _extension: any;

    _init(extension: any) {
      super._init({
        style_class: 'quick-settings-item', // Using base style
        can_focus: true,
      });

      this._extension = extension;
      
      // We want it to look like the "Night Light" or "Dark Style" buttons (pills).
      // They typically contain an Icon and a Label.
      
      // Create a box for content
      const box = new St.BoxLayout({
        vertical: false, 
        x_align: St.Align.CENTER,
        y_align: St.Align.CENTER, 
        style_class: 'quick-toggle-content', // This CSS class might help it align
        spacing: 12
      });

      const icon = new St.Icon({
        icon_name: 'system-run-symbolic',
        style_class: 'quick-toggle-icon',
      });

      const label = new St.Label({
        text: 'Routines',
        y_align: St.Align.CENTER,
        style_class: 'quick-toggle-title',
      });

      box.add_child(icon);
      box.add_child(label);

      // @ts-ignore
      this.set_child(box);

      // @ts-ignore
      this.connect('clicked', () => {
        debugLog('[QuickSettings] Opening preferences...');
        this._extension.openPreferences();
        
        // Close the quick settings menu
        Main.panel.closeQuickSettings();
        // @ts-ignore
        Main.overview.hide();
      });
    }
  }
);

export default RoutineQuickSettingsItem;
