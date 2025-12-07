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
import { RoutineEditor } from './editor.js';
import { ImportExportManager } from '../engine/importExport.js';
import debugLog from '../utils/log.js';

// @ts-ignore


export default class GnomeRoutinesPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window: any) {
    const settings = this.getSettings();

    const page = new Adw.PreferencesPage();

    // State
    let currentSearchTerm = '';
    let routines: any[] = [];

    // Header Controls (Search + Add + Menu) - Detached Box
    const headerBox = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 12,
      margin_bottom: 0, // Reduced margin
      margin_start: 12,
      margin_end: 12,
    });

    // Search Entry
    const searchEntry = new Gtk.SearchEntry({
      placeholder_text: 'Search routines...',
    });
    searchEntry.hexpand = true;
    // @ts-ignore
    searchEntry.connect('search-changed', (entry) => {
      currentSearchTerm = entry.get_text().toLowerCase();
      refreshList();
    });
    headerBox.append(searchEntry);

    // Add Button
    const addButton = new Gtk.Button({
      label: 'Add Routine',
      valign: Gtk.Align.CENTER,
      // css_classes: ['suggested-action'], // User wanted normal button previously
    });
    // @ts-ignore
    addButton.connect('clicked', () => {
      try {
        debugLog('Opening Routine Editor...');
        const editor = new RoutineEditor(settings, null, (newRoutine) => {
          routines = JSON.parse(settings.get_string('routines') || '[]');
          routines.push(newRoutine);
          settings.set_string('routines', JSON.stringify(routines));
          debugLog('Routine saved', newRoutine);
          refreshList();
        });
        editor.show(window);
      } catch (e) {
        console.error('Failed to open Routine Editor:', e);
      }
    });
    headerBox.append(addButton);

    // Global Menu Button
    const globalMenu = new Gio.Menu();
    globalMenu.append('Import Routines...', 'global.import');
    globalMenu.append('Export All Routines', 'global.export');

    const globalActionGroup = new Gio.SimpleActionGroup();

    // Import Action
    const importAction = new Gio.SimpleAction({ name: 'import' });
    // @ts-ignore
    importAction.connect('activate', () => {
      const picker = new Gtk.FileChooserNative({
        title: 'Import Routines',
        action: Gtk.FileChooserAction.OPEN,
        transient_for: window,
      });
      const filter = new Gtk.FileFilter();
      filter.set_name('JSON Files');
      filter.add_mime_type('application/json');
      picker.add_filter(filter);

      // @ts-ignore
      picker.connect('response', (self, response_id) => {
        if (response_id === Gtk.ResponseType.ACCEPT) {
          try {
            const file = picker.get_file();
            // @ts-ignore
            const [success, contents] = file.load_contents(null);
            if (success) {
              const decoder = new TextDecoder('utf-8');
              const json = decoder.decode(contents);
              const newRoutines = ImportExportManager.importRoutines(json);

              // Load current
              const currentRoutines = JSON.parse(
                settings.get_string('routines') || '[]'
              );
              currentRoutines.push(...newRoutines);

              settings.set_string('routines', JSON.stringify(currentRoutines));
              refreshList();
              debugLog(`Imported ${newRoutines.length} routines`);
            }
          } catch (e) {
            console.error('Import failed', e);
          }
        }
        picker.destroy();
      });
      picker.show();
    });
    globalActionGroup.add_action(importAction);

    // Export Action
    const exportAllAction = new Gio.SimpleAction({ name: 'export' });
    // @ts-ignore
    exportAllAction.connect('activate', () => {
      routines = JSON.parse(settings.get_string('routines') || '[]');
      if (routines.length === 0) return;
      exportRoutinesUI(routines, 'routines_export.json');
    });
    globalActionGroup.add_action(exportAllAction);

    const globalMenuBtn = new Gtk.MenuButton({
      icon_name: 'view-more-symbolic',
      valign: Gtk.Align.CENTER,
      menu_model: globalMenu,
    });
    globalMenuBtn.insert_action_group('global', globalActionGroup);
    headerBox.append(globalMenuBtn);

    // Create a group specifically for controls to satisfy AdwPreferencesPage
    // Merged Title "Routines" here to reduce spacing
    const controlsGroup = new Adw.PreferencesGroup({ title: 'Routines' });
    controlsGroup.add(headerBox);
    page.add(controlsGroup);

    // List Group (Untitled, detached)
    let listGroup = new Adw.PreferencesGroup(); // mutable
    page.add(listGroup);

    // Helper for Export UI
    const exportRoutinesUI = (routinesToExport: any[], filename: string) => {
      const picker = new Gtk.FileChooserNative({
        title: 'Export Routines',
        action: Gtk.FileChooserAction.SAVE,
        transient_for: window,
      });
      const filter = new Gtk.FileFilter();
      filter.set_name('JSON Files');
      filter.add_mime_type('application/json');
      picker.add_filter(filter);
      picker.set_current_name(filename);

      // @ts-ignore
      picker.connect('response', (self, response_id) => {
        if (response_id === Gtk.ResponseType.ACCEPT) {
          try {
            const json = ImportExportManager.exportRoutines(routinesToExport);
            const file = picker.get_file();
            // @ts-ignore
            file.replace_contents(
              json,
              null,
              false,
              Gio.FileCreateFlags.NONE,
              null
            );
            debugLog('Export successful');
          } catch (e) {
            console.error('Export failed', e);
          }
        }
        picker.destroy();
      });
      picker.show();
    };

    // Helper to refresh list
    const refreshList = () => {
      // Remove all rows
      // AdwPreferencesGroup doesn't have remove_all?
      // remove() removes specific child.
      // We can recreate the group.

      // We need to insert the new group at the correct position (after headerGroup).
      // page.remove(listGroup);
      // But page.remove requires widget instance.
      // And page.add adds to end.
      // Does AdwPreferencesPage support insert? No.
      // Wait, AdwPreferencesPage is a GtkBin? No, it contains AdwPreferencesGroup.
      // We can just clear the group IF it supported remove_all.
      // Since it doesn't, recreating is best but we lose position.
      // WORKAROUND: Remove toolsGroup, Remove listGroup, Re-add listGroup, Re-add toolsGroup.
      // This ensures order: Header -> List -> Tools.

      page.remove(listGroup);

      const newGroup = new Adw.PreferencesGroup(); // Untitled

      // Re-fetch routines
      const routinesJson = settings.get_string('routines');
      try {
        routines = JSON.parse(routinesJson || '[]');
      } catch (e) {
        console.error('Failed to parse routines', e);
        routines = [];
      }

      const filteredRoutines = routines.filter((r) =>
        r.name.toLowerCase().includes(currentSearchTerm)
      );

      if (filteredRoutines.length === 0) {
        const emptyRow = new Adw.ActionRow({
          title: currentSearchTerm
            ? 'No matching routines'
            : 'No routines configured',
        });
        newGroup.add(emptyRow);
      } else {
        filteredRoutines.forEach((routine: any) => {
          // Find original index for update logic
          const originalIndex = routines.findIndex((r) => r.id === routine.id); // Need ID. If no ID, use ref equality?
          // Routine objects in filteredRoutines are same refs as in routines (if filter doesn't clone). Yes.
          // Be safe using indexOf or ID.
          // Assuming unique IDs.
          const index = routines.indexOf(routine);

          const row = new Adw.ActionRow({
            title: routine.name,
            subtitle: routine.enabled ? 'Enabled' : 'Disabled',
          });

          // Make row clickable to edit
          row.activatable = true;
          // @ts-ignore
          row.connect('activated', () => {
            const editor = new RoutineEditor(
              settings,
              routine,
              (updatedRoutine) => {
                routines[index] = updatedRoutine;
                settings.set_string('routines', JSON.stringify(routines));
                refreshList();
              }
            );
            editor.show(window);
          });

          // Toggle Switch
          const toggle = new Gtk.Switch({ active: routine.enabled });
          toggle.valign = Gtk.Align.CENTER;
          // @ts-ignore
          toggle.connect('notify::active', () => {
            routine.enabled = toggle.active;
            row.subtitle = routine.enabled ? 'Enabled' : 'Disabled';
            settings.set_string('routines', JSON.stringify(routines));
          });
          row.add_suffix(toggle);

          // More Actions Menu (Standard Gio.Menu)
          const menu = new Gio.Menu();
          menu.append('Restart Routine', 'routine.restart');
          menu.append('Export JSON', 'routine.export');
          menu.append('Delete', 'routine.delete');

          const actionGroup = new Gio.SimpleActionGroup();

          // Restart Action
          const restartAction = new Gio.SimpleAction({ name: 'restart' });
          // @ts-ignore
          restartAction.connect('activate', () => {
            routine.enabled = false;
            settings.set_string('routines', JSON.stringify(routines));
            refreshList();

            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
              routine.enabled = true;
              settings.set_string('routines', JSON.stringify(routines));
              refreshList();
              return GLib.SOURCE_REMOVE;
            });
          });
          actionGroup.add_action(restartAction);

          // Export Action
          const exportAction = new Gio.SimpleAction({ name: 'export' });
          // @ts-ignore
          exportAction.connect('activate', () => {
            exportRoutinesUI(
              [routine],
              `${routine.name.replace(/\s+/g, '_').toLowerCase()}.json`
            );
          });
          actionGroup.add_action(exportAction);

          // Delete Action
          const deleteAction = new Gio.SimpleAction({ name: 'delete' });
          // @ts-ignore
          deleteAction.connect('activate', () => {
            routines.splice(index, 1);
            settings.set_string('routines', JSON.stringify(routines));
            refreshList();
          });
          actionGroup.add_action(deleteAction);

          const moreBtn = new Gtk.MenuButton({
            icon_name: 'view-more-symbolic',
            valign: Gtk.Align.CENTER,
            menu_model: menu,
          });
          moreBtn.add_css_class('flat');
          moreBtn.insert_action_group('routine', actionGroup);

          row.add_suffix(moreBtn);
          newGroup.add(row);
        });
      }

      page.add(newGroup);

      // Update reference
      listGroup = newGroup;
    };

    // Initial load
    refreshList();

    window.add(page);
  }
}
