// @ts-ignore
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { RoutinesPage } from './ui/prefs/RoutinesPage.js';

export default class GnomeRoutinesPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window: any) {
    window.set_default_size(800, 600);
    window.set_size_request(600, 500);

    const settings = (this as any).getSettings();
    const page = new RoutinesPage(settings, window);
    window.add(page.widget);
  }
}
