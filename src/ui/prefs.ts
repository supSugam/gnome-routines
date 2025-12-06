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
globalThis.debugLog = debugLog;

export default class GnomeRoutinesPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window: any) {
    const settings = this.getSettings();

    const page = new Adw.PreferencesPage();

    // State
    let currentSearchTerm = '';
    let routines: any[] = [];

    // Header Group ("Routines" title only)
    const headerGroup = new Adw.PreferencesGroup({ title: 'Routines' });
    page.add(headerGroup);

    // Header Controls (Search + Add) - Detached Box
    const headerBox = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 12, // Standard spacing
      margin_bottom: 12, // Space before list
      margin_start: 12, // Align with group content usually
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
      css_classes: ['suggested-action'], // Make it pop a bit as primary action? User said "normal button". "suggested-action" is standard for Add.
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

    // Add box to page (AdwPreferencesPage is a GtkBin/Widget container)
    page.add(headerBox);

    // List Group (Untitled, detached)
    let listGroup = new Adw.PreferencesGroup(); // mutable
    page.add(listGroup);

    // Tools Group
    const toolsGroup = new Adw.PreferencesGroup({ title: 'Tools' });
    page.add(toolsGroup);

    // Import Button
    const importRow = new Adw.ActionRow({
      title: 'Import Routines',
      subtitle: 'Import routines from a JSON file',
    });
    const importBtn = new Gtk.Button({
      icon_name: 'document-open-symbolic',
      valign: Gtk.Align.CENTER,
    });
    importBtn.add_css_class('flat');
    // @ts-ignore
    importBtn.connect('clicked', () => {
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
    importRow.add_suffix(importBtn);
    toolsGroup.add(importRow);

    // Export All Button
    const exportAllRow = new Adw.ActionRow({
      title: 'Export All Routines',
      subtitle: 'Save all routines to a JSON file',
    });
    const exportAllBtn = new Gtk.Button({
      icon_name: 'document-save-symbolic',
      valign: Gtk.Align.CENTER,
    });
    exportAllBtn.add_css_class('flat');
    // @ts-ignore
    exportAllBtn.connect('clicked', () => {
      routines = JSON.parse(settings.get_string('routines') || '[]');
      if (routines.length === 0) return;
      exportRoutinesUI(routines, 'routines_export.json');
    });
    exportAllRow.add_suffix(exportAllBtn);
    toolsGroup.add(exportAllRow);

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
      page.remove(toolsGroup);

      const newGroup = new Adw.PreferencesGroup(); // Untitled
      const newToolsGroup = toolsGroup; // Reuse tools group? widgets might be destroyed if parent removed? No, remove from container just unparents.
      // But toolsGroup is bound to page.
      // Let's rely on re-adding safe.

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
      page.add(toolsGroup);

      // Update reference
      listGroup = newGroup;
    };

    // Initial load
    refreshList();

    window.add(page);
  }
}
