// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import Gio from 'gi://Gio';
import { RoutineEditor } from '../editor.js';
import { ImportExportManager } from '../../engine/importExport.js';
import debugLog from '../../utils/log.js';
import { exportRoutinesUI } from './utils.js';

export class PreferencesHeader {
  public widget: any;
  private settings: any;
  private parentWindow: any;
  private onRefresh: () => void;
  public onSearch: (term: string) => void;

  constructor(
    settings: any,
    parentWindow: any,
    onRefresh: () => void,
    onSearch: (term: string) => void
  ) {
    this.settings = settings;
    this.parentWindow = parentWindow;
    this.onRefresh = onRefresh;
    this.onSearch = onSearch;
    this.widget = this.createHeader();
  }

  private createHeader() {
    const headerBox = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 12,
      margin_bottom: 0,
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
      this.onSearch(entry.get_text().toLowerCase());
    });
    headerBox.append(searchEntry);

    // Add Button
    const addButton = new Gtk.Button({
      label: 'Add Routine',
      valign: Gtk.Align.CENTER,
    });
    // @ts-ignore
    addButton.connect('clicked', () => {
      this.openAddDialog();
    });
    headerBox.append(addButton);

    // Menu
    const menuBtn = this.createGlobalMenu();
    headerBox.append(menuBtn);

    return headerBox;
  }

  private openAddDialog() {
    try {
      debugLog('Opening Routine Editor...');
      const editor = new RoutineEditor(this.settings, null, (newRoutine) => {
        const routines = JSON.parse(
          this.settings.get_string('routines') || '[]'
        );
        routines.push(newRoutine);
        this.settings.set_string('routines', JSON.stringify(routines));
        debugLog('Routine saved', newRoutine);
        this.onRefresh();
      });
      editor.show(this.parentWindow);
    } catch (e) {
      console.error('Failed to open Routine Editor:', e);
    }
  }

  private createGlobalMenu() {
    const globalMenu = new Gio.Menu();
    globalMenu.append('Import Routines...', 'global.import');
    globalMenu.append('Export All Routines', 'global.export');

    const globalActionGroup = new Gio.SimpleActionGroup();

    // Import
    const importAction = new Gio.SimpleAction({ name: 'import' });
    // @ts-ignore
    importAction.connect('activate', () => this.handleImport());
    globalActionGroup.add_action(importAction);

    // Export
    const exportAllAction = new Gio.SimpleAction({ name: 'export' });
    // @ts-ignore
    exportAllAction.connect('activate', () => this.handleExport());
    globalActionGroup.add_action(exportAllAction);

    const globalMenuBtn = new Gtk.MenuButton({
      icon_name: 'view-more-symbolic',
      valign: Gtk.Align.CENTER,
      menu_model: globalMenu,
    });
    globalMenuBtn.insert_action_group('global', globalActionGroup);
    return globalMenuBtn;
  }

  private handleImport() {
    const picker = new Gtk.FileChooserNative({
      title: 'Import Routines',
      action: Gtk.FileChooserAction.OPEN,
      transient_for: this.parentWindow,
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

            const currentRoutines = JSON.parse(
              this.settings.get_string('routines') || '[]'
            );
            currentRoutines.push(...newRoutines);

            this.settings.set_string('routines', JSON.stringify(currentRoutines));
            this.onRefresh();
            debugLog(`Imported ${newRoutines.length} routines`);
          }
        } catch (e) {
          console.error('Import failed', e);
        }
      }
      picker.destroy();
    });
    picker.show();
  }

  private handleExport() {
    const routines = JSON.parse(this.settings.get_string('routines') || '[]');
    if (routines.length === 0) return;
    exportRoutinesUI(routines, 'routines_export.json', this.parentWindow);
  }
}
