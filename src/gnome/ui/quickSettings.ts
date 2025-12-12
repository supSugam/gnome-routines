import GObject from 'gi://GObject';
// @ts-ignore
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
// @ts-ignore
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import debugLog from '../../utils/log.js';

// @ts-ignore
import GLib from 'gi://GLib';

import type { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

// Simple QuickToggle subclass - no custom constructor params
const RoutinesQuickToggle = GObject.registerClass(
  class RoutinesQuickToggle extends QuickSettings.QuickToggle {
    _init() {
      super._init({
        title: 'Routines',
        iconName: 'view-list-bullet-symbolic',
        toggleMode: false, // Acts as a button, not a toggle
      });
      debugLog('[QuickSettings] RoutinesQuickToggle _init');
    }
  }
);

export function createQuickSettingsToggle(extension: Extension, manager: any) {
  debugLog('[QuickSettings] Creating toggle');

  const toggle = new RoutinesQuickToggle();

  // Set initial state
  const count = manager?.getEnabledRoutineCount() ?? 0;
  debugLog(`[QuickSettings] Initial count = ${count}`);
  // @ts-ignore
  toggle.checked = count > 0;
  // @ts-ignore
  toggle.subtitle =
    count > 0
      ? `${count} ${count === 1 ? 'routine' : 'routines'} running`
      : 'No routines running';

  toggle.connect('clicked', () => {
    Main.panel.closeQuickSettings();
    extension.openPreferences();
    return GLib.SOURCE_REMOVE;
  });

  return {
    toggle,
    updateState: () => {
      const c = manager?.getEnabledRoutineCount() ?? 0;
      debugLog(`[QuickSettings] updateState count = ${c}`);
      // @ts-ignore
      toggle.checked = c > 0;
      // @ts-ignore
      toggle.subtitle =
        c > 0
          ? `${c} ${c === 1 ? 'routine' : 'routines'} running`
          : 'No routines running';
    },
  };
}
