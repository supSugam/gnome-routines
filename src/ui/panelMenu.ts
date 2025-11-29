// @ts-ignore
import St from 'gi://St';
// @ts-ignore
import Clutter from 'gi://Clutter';
// @ts-ignore
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
// @ts-ignore
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
// @ts-ignore
import GObject from 'gi://GObject';

const GnomeRoutinesIndicator = GObject.registerClass(
class GnomeRoutinesIndicator extends PanelMenu.Button {
    constructor() {
        super(0.0, 'Gnome Routines');

        const icon = new St.Icon({
            icon_name: 'system-run-symbolic',
            style_class: 'system-status-icon',
        });
        // @ts-ignore
        this.add_child(icon);

        // @ts-ignore
        this.menu.addMenuItem(new PopupMenu.PopupMenuItem('Active Routines: None'));
        // @ts-ignore
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        // @ts-ignore
        this.menu.addMenuItem(new PopupMenu.PopupMenuItem('Settings'));
    }
});

export default GnomeRoutinesIndicator;
