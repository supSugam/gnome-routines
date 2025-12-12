// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import GLib from 'gi://GLib';

import { RoutineEditor } from '../editor.js';
import { exportRoutinesUI } from './utils.js';

export class RoutineList {
  private settings: any;
  private parentWindow: any;
  private onUpdate: () => void;

  constructor(settings: any, parentWindow: any, onUpdate: () => void) {
    this.settings = settings;
    this.parentWindow = parentWindow;
    this.onUpdate = onUpdate;
  }

  public createGroup(routines: any[], filterText: string): any {
    const group = new Adw.PreferencesGroup();
    const filtered = routines.filter((r) =>
      r.name.toLowerCase().includes(filterText)
    );

    if (filtered.length === 0) {
      const emptyRow = new Adw.ActionRow({
        title: filterText ? 'No matching routines' : 'No routines configured',
      });
      group.add(emptyRow);
      return group;
    }

    filtered.forEach((routine) => {
      // Find index in original array
      const index = routines.indexOf(routine);
      const row = this.createRow(routine, index, routines);
      group.add(row);
    });

    return group;
  }

  private createRow(routine: any, index: number, allRoutines: any[]) {
    const row = new Adw.ActionRow({
      title: routine.name,
      subtitle: routine.enabled ? 'Enabled' : 'Disabled',
    });

    row.activatable = true;
    // @ts-ignore
    row.connect('activated', () => {
      const editor = new RoutineEditor(
        this.settings,
        routine,
        (updatedRoutine) => {
          allRoutines[index] = updatedRoutine;
          this.save(allRoutines);
        }
      );
      editor.show(this.parentWindow);
    });

    // Toggle
    const toggle = new Gtk.Switch({ active: routine.enabled });
    toggle.valign = Gtk.Align.CENTER;
    // @ts-ignore
    toggle.connect('notify::active', () => {
      routine.enabled = toggle.active;
      row.subtitle = routine.enabled ? 'Enabled' : 'Disabled';
      this.save(allRoutines);
    });
    row.add_suffix(toggle);

    // Menu
    const menuBtn = this.createRowMenu(routine, index, allRoutines);
    row.add_suffix(menuBtn);

    return row;
  }

  private createRowMenu(routine: any, index: number, allRoutines: any[]) {
    const menu = new Gio.Menu();
    menu.append('Restart Routine', 'routine.restart');
    menu.append('Export JSON', 'routine.export');
    menu.append('Delete', 'routine.delete');

    const actionGroup = new Gio.SimpleActionGroup();

    // Restart
    const restartAction = new Gio.SimpleAction({ name: 'restart' });
    // @ts-ignore
    restartAction.connect('activate', () => {
      routine.enabled = false;
      this.save(allRoutines);

      GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
        routine.enabled = true;
        this.save(allRoutines);
        return GLib.SOURCE_REMOVE;
      });
    });
    actionGroup.add_action(restartAction);

    // Export
    const exportAction = new Gio.SimpleAction({ name: 'export' });
    // @ts-ignore
    exportAction.connect('activate', () => {
      exportRoutinesUI(
        [routine],
        `${routine.name.replace(/\s+/g, '_').toLowerCase()}.json`,
        this.parentWindow
      );
    });
    actionGroup.add_action(exportAction);

    // Delete
    const deleteAction = new Gio.SimpleAction({ name: 'delete' });
    // @ts-ignore
    deleteAction.connect('activate', () => {
      allRoutines.splice(index, 1);
      this.save(allRoutines);
    });
    actionGroup.add_action(deleteAction);

    const moreBtn = new Gtk.MenuButton({
      icon_name: 'view-more-symbolic',
      valign: Gtk.Align.CENTER,
      menu_model: menu,
    });
    moreBtn.add_css_class('flat');
    moreBtn.insert_action_group('routine', actionGroup);

    return moreBtn;
  }

  private save(routines: any[]) {
    this.settings.set_string('routines', JSON.stringify(routines));
    this.onUpdate();
  }
}
