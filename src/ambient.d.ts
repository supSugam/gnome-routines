declare module 'resource:///org/gnome/shell/extensions/extension.js' {
    export class Extension {
        uuid: string;
        dir: any;
        path: string;
        metadata: any;
        getSettings(schema?: string): any;
        openPreferences(): void;
        enable(): void;
        disable(): void;
    }
}

declare module 'resource:///org/gnome/shell/ui/main.js' {
    export const panel: any;
    export const messageTray: any;
    export const extensionManager: any;
}

declare module 'resource:///org/gnome/shell/ui/panelMenu.js' {
    export class Button {
        constructor(align: number, name: string, createIcon?: boolean);
        menu: any;
        add_child(child: any): void;
        destroy(): void;
    }
}

declare module 'resource:///org/gnome/shell/ui/popupMenu.js' {
    export class PopupMenuItem {
        constructor(text: string);
    }
    export class PopupSeparatorMenuItem {}
}

declare module 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js' {
    export class ExtensionPreferences {
        fillPreferencesWindow(window: any): void;
        getSettings(schema?: string): any;
    }
}

declare module 'gi://Shell' {
    export const AppSystem: any;
    export const AppState: any;
}

declare module 'gi://St';
declare module 'gi://Clutter';
declare module 'gi://Gio';
declare module 'gi://GObject';
declare module 'gi://Gtk';
declare module 'gi://Adw';
