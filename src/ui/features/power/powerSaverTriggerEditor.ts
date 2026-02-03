// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
import { BaseEditor } from '../../components/baseEditor.js';
import { PowerProfile } from '../../../engine/types.js';

export class PowerSaverTriggerEditor extends BaseEditor {
  render(group: any): void {
    // Defaults
    if (!this.config.profile) this.config.profile = PowerProfile.POWER_SAVER;

    // Warning
    const infoRow = new Adw.ActionRow({
      title: 'Requires power-profiles-daemon',
      subtitle:
        'The service must be installed and running for this trigger to work',
      icon_name: 'dialog-information-symbolic',
    });

    infoRow.add_css_class('dim-label');
    group.add(infoRow);

    const profileModel = new Gtk.StringList({
      strings: ['Performance', 'Balanced', 'Power Saver'],
    });

    const profiles = [
      PowerProfile.PERFORMANCE,
      PowerProfile.BALANCED,
      PowerProfile.POWER_SAVER,
    ];

    const currentProfile = this.config.profile as PowerProfile;
    const selectedIndex = profiles.indexOf(currentProfile);

    const profileRow = new Adw.ComboRow({
      title: 'Trigger when profile is',
      subtitle: 'Fires when system switches to this power profile',
      model: profileModel,
      selected: selectedIndex >= 0 ? selectedIndex : 2, // Default to Power Saver
    });

    group.add(profileRow);

    // @ts-ignore
    profileRow.connect('notify::selected', () => {
      this.config.profile = profiles[profileRow.selected];
      this.onChange();
    });
  }

  validate(): boolean | string {
    if (!this.config.profile) return 'Please select a power profile';

    return true;
  }
}
