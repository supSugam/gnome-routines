
const Adw = imports.gi.Adw;
const Gtk = imports.gi.Gtk;

// Initialize
Gtk.init(null);

console.log('Adw version:', Adw.get_major_version(), Adw.get_minor_version());

const view = new Adw.NavigationView();
console.log('NavigationView methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(view)));

// Check if pop_to_tag exists
if (view.pop_to_tag) {
    console.log('pop_to_tag exists');
} else {
    console.log('pop_to_tag DOES NOT exist');
}
