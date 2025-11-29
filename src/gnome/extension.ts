import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { RoutineManager } from '../engine/manager.js';
import { GnomeShellAdapter } from './adapters/gnomeShellAdapter.js';
import { Routine } from '../engine/types.js';


import GnomeRoutinesIndicator from '../ui/panelMenu.js';
// @ts-ignore
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { GSettingsStorageAdapter } from './adapters/gsettingsStorage.js';

export default class GnomeRoutinesExt extends Extension {
  private manager: RoutineManager | null = null;
  private adapter: GnomeShellAdapter | null = null;
  private indicator: any = null;
  private settingsChangedId: number | null = null;

  enable() {
    console.log('[GnomeRoutines] Enabling extension version 1.0.0');
    this.adapter = new GnomeShellAdapter();
    const settings = this.getSettings();
    const storage = new GSettingsStorageAdapter(settings);
    this.manager = new RoutineManager(storage, this.adapter);

    // Load routines
    this.manager.load();

    // Watch for settings changes (when user toggles routines in prefs)
    this.settingsChangedId = settings.connect('changed::routines', () => {
      console.log('[GnomeRoutines] Settings changed, updating enabled states');
      if (this.manager) {
        // Get updated routines from settings
        const updatedRoutines = JSON.parse(settings.get_string('routines'));

        // Update enabled flags for existing routine instances
        updatedRoutines.forEach((updatedRoutine: any) => {
          const existing = this.manager!.getRoutine(updatedRoutine.id);
          if (existing) {
            existing.enabled = updatedRoutine.enabled;
          }
        });

        // Re-evaluate to activate/deactivate based on new enabled states
        this.manager.evaluate();
      }
    });

    // Add panel menu
    this.indicator = new GnomeRoutinesIndicator();
    Main.panel.addToStatusArea('gnome-routines', this.indicator);
  }

  disable() {
    console.log('Disabling Gnome Routines');

    // Disconnect settings watcher
    if (this.settingsChangedId !== null) {
      const settings = this.getSettings();
      settings.disconnect(this.settingsChangedId);
      this.settingsChangedId = null;
    }

    if (this.indicator) {
      this.indicator.destroy();
      this.indicator = null;
    }
    if (this.adapter) {
      this.adapter.destroy();
      this.adapter = null;
    }
    this.manager = null;
  }
}
