import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { RoutineManager } from '../engine/manager.js';
import { GnomeShellAdapter } from './adapters/gnomeShellAdapter.js';

// @ts-ignore
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { GSettingsStorageAdapter } from './adapters/gsettingsStorage.js';

import debugLog from '../utils/log.js';

import { createQuickSettingsToggle } from './ui/quickSettings.js';

export default class GnomeRoutinesExt extends Extension {
  private manager: RoutineManager | null = null;
  private adapter: GnomeShellAdapter | null = null;
  private settingsChangedId: number | null = null;
  private quickSettingsToggle: any = null;
  private quickSettingsUpdateFn: (() => void) | null = null;

  enable() {
    debugLog('[GnomeRoutines] Enabling extension version 1.');
    this.adapter = new GnomeShellAdapter();
    const settings = this.getSettings();
    const storage = new GSettingsStorageAdapter(settings);
    this.manager = new RoutineManager(storage, this.adapter, settings);

    // Add Quick Settings Toggle
    try {
      const qs = createQuickSettingsToggle(this, this.manager);
      this.quickSettingsToggle = qs.toggle;
      this.quickSettingsUpdateFn = qs.updateState;
      // @ts-ignore
      Main.panel.statusArea.quickSettings.menu.addItem(
        this.quickSettingsToggle
      );
      debugLog('[GnomeRoutines] Quick Settings Toggle added');
    } catch (e) {
      console.error('[GnomeRoutines] Failed to create Quick Settings:', e);
    }

    // Load routines and update Quick Settings state after load completes
    this.manager
      .load()
      .then(() => {
        debugLog('[GnomeRoutines] load() completed, updating Quick Settings');
        if (this.quickSettingsUpdateFn) {
          this.quickSettingsUpdateFn();
        }
      })
      .catch((e: any) => {
        console.error('[GnomeRoutines] Error during load:', e);
      });

    // Watch for settings changes
    this.settingsChangedId = settings.connect('changed::routines', () => {
      debugLog('[GnomeRoutines] Settings changed, reloading...');
      if (this.manager) {
        this.manager.reload();
      }
      if (this.quickSettingsUpdateFn) {
        this.quickSettingsUpdateFn();
      }
    });
  }

  disable() {
    debugLog('Disabling Gnome Routines');

    if (this.quickSettingsToggle) {
      this.quickSettingsToggle.destroy();
      this.quickSettingsToggle = null;
      this.quickSettingsUpdateFn = null;
    }

    if (this.settingsChangedId !== null) {
      const settings = this.getSettings();
      settings.disconnect(this.settingsChangedId);
      this.settingsChangedId = null;
    }

    if (this.manager) {
      this.manager.destroy();
      this.manager = null;
    }

    if (this.adapter) {
      this.adapter.destroy();
      this.adapter = null;
    }
  }
}

