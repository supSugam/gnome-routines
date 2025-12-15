
const Adw = imports.gi.Adw;
const Gtk = imports.gi.Gtk;

// Initialize
Gtk.init(null);

debugLog('Adw version:', Adw.get_major_version(), Adw.get_minor_version());

const view = new Adw.NavigationView();
debugLog(
  'NavigationView methods:',
  Object.getOwnPropertyNames(Object.getPrototypeOf(view))
);

// Check if pop_to_tag exists
if (view.pop_to_tag) {
  debugLog('pop_to_tag exists');
} else {
  debugLog('pop_to_tag DOES NOT exist');
}
