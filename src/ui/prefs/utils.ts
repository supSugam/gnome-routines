// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import Gio from 'gi://Gio';
import { ImportExportManager } from '../../engine/importExport.js';
import debugLog from '../../utils/log.js';

export const exportRoutinesUI = (
  routinesToExport: any[],
  filename: string,
  parentWindow: any
) => {
  const picker = new Gtk.FileChooserNative({
    title: 'Export Routines',
    action: Gtk.FileChooserAction.SAVE,
    transient_for: parentWindow,
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
