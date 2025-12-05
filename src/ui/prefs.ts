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
import debugLog from '../utils/log.js';

// @ts-ignore
globalThis.debugLog = debugLog;

export default class GnomeRoutinesPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window: any) {
    const settings = this.getSettings();

    const page = new Adw.PreferencesPage();
    let group = new Adw.PreferencesGroup({ title: 'Routines' }); // Declare group as mutable
    // page.add(group); // Initial group is added by refreshList

    // Add Routine Button (created once)
    const addButton = new Gtk.Button({
      label: 'Add Routine',
      halign: Gtk.Align.CENTER,
      margin_top: 10,
      margin_bottom: 10,
    });
    // @ts-ignore
    addButton.connect('clicked', () => {
      try {
        debugLog('Opening Routine Editor...');
        const editor = new RoutineEditor(null, (newRoutine) => {
          // Re-fetch routines to ensure we append to the latest state
          let routines = JSON.parse(settings.get_string('routines') || '[]');
          routines.push(newRoutine);
          settings.set_string('routines', JSON.stringify(routines));
          debugLog('Routine saved', newRoutine);
          refreshList(); // Refresh UI after adding
        });
        editor.show(window);
      } catch (e) {
        console.error('Failed to open Routine Editor:', e);
      }
    });

    // Helper to refresh list
    const refreshList = () => {
      // Remove all rows
      // AdwPreferencesGroup doesn't have remove_all?
      // We can iterate children?
      // Or just recreate the group?
      // Recreating group is easier but we need to remove old group from page.
      page.remove(group);
      const newGroup = new Adw.PreferencesGroup({ title: 'Routines' });
      page.add(newGroup);

      // Re-add Add Button
      newGroup.add(addButton);

      // Re-fetch routines
      const routinesJson = settings.get_string('routines');
      let routines: any[] = [];
      try {
        routines = JSON.parse(routinesJson || '[]'); // Ensure default empty array if string is null/undefined
      } catch (e) {
        console.error('Failed to parse routines', e);
      }

      if (routines.length === 0) {
        const emptyRow = new Adw.ActionRow({ title: 'No routines configured' });
        newGroup.add(emptyRow);
      } else {
        routines.forEach((routine: any, index: number) => {
          const row = new Adw.ActionRow({ title: routine.name });

          // Edit Button
          const editBtn = new Gtk.Button({
            icon_name: 'document-edit-symbolic',
            valign: Gtk.Align.CENTER,
          });
          editBtn.add_css_class('flat');
          // @ts-ignore
          editBtn.connect('clicked', () => {
            const editor = new RoutineEditor(routine, (updatedRoutine) => {
              routines[index] = updatedRoutine;
              settings.set_string('routines', JSON.stringify(routines));
              refreshList();
            });
            editor.show(window);
          });
          row.add_suffix(editBtn);

          // Restart Button
          const restartBtn = new Gtk.Button({
            icon_name: 'view-refresh-symbolic',
            valign: Gtk.Align.CENTER,
          });
          restartBtn.add_css_class('flat');
          restartBtn.tooltip_text = 'Restart Routine';
          // @ts-ignore
          restartBtn.connect('clicked', () => {
            routine.enabled = false;
            settings.set_string('routines', JSON.stringify(routines));
            refreshList(); // Update toggle visual

            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
              routine.enabled = true;
              settings.set_string('routines', JSON.stringify(routines));
              refreshList(); // Update toggle visual
              return GLib.SOURCE_REMOVE;
            });
          });
          row.add_suffix(restartBtn);

          // Delete Button
          const deleteBtn = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            valign: Gtk.Align.CENTER,
          });
          deleteBtn.add_css_class('flat');
          // @ts-ignore
          deleteBtn.connect('clicked', () => {
            routines.splice(index, 1);
            settings.set_string('routines', JSON.stringify(routines));
            refreshList();
          });
          row.add_suffix(deleteBtn);

          const toggle = new Gtk.Switch({ active: routine.enabled });
          toggle.valign = Gtk.Align.CENTER;
          // @ts-ignore
          toggle.connect('notify::active', () => {
            routine.enabled = toggle.active;
            settings.set_string('routines', JSON.stringify(routines));
          });
          row.add_suffix(toggle);
          newGroup.add(row);
        });
      }
      // Update reference
      group = newGroup;
    };

    // Initial load
    refreshList();

    window.add(page);
  }
}
