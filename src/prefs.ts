// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import GObject from 'gi://GObject';
// @ts-ignore
import GLib from 'gi://GLib';
// @ts-ignore
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { RoutinesPage } from './ui/prefs/RoutinesPage.js';

export default class GnomeRoutinesPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window: any) {
    window.set_default_size(800, 600);
    window.set_size_request(600, 500);

    const settings = this.getSettings();
    const page = new RoutinesPage(settings, window);
    window.add(page.widget);
  }
}
