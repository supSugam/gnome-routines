import { SystemAdapter } from './adapter.js';

// @ts-ignore
import Shell from "gi://Shell";
// @ts-ignore
import * as Main from "resource:///org/gnome/shell/ui/main.js";
// @ts-ignore
import * as MessageTray from "resource:///org/gnome/shell/ui/messageTray.js";
// @ts-ignore
import Gio from "gi://Gio";

declare const global: any;

export class GnomeShellAdapter implements SystemAdapter {
    private appSystem: any;
    private appListenerId: number = 0;

    constructor() {
        this.appSystem = Shell.AppSystem.get_default();
    }

    showNotification(title: string, body: string): void {
        const source = new MessageTray.Source('Gnome Routines', 'system-run-symbolic');
        Main.messageTray.add(source);
        const notification = new MessageTray.Notification(source, title, body);
        source.notify(notification);
    }

    setDND(enabled: boolean): void {
        // GNOME 46+ uses GSettings for DND usually, or the status area
        // This is a simplified example
        const settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.notifications' });
        settings.set_boolean('show-banners', !enabled);
    }

    setBrightness(percentage: number): void {
        // Requires interacting with GSD Power or Backlight interface via DBus
        console.log(`Setting brightness to ${percentage}%`);
    }

    setWallpaper(uri: string): void {
        console.log(`[GnomeShellAdapter] Setting wallpaper to: ${uri}`);
        const settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.background' });
        settings.set_string('picture-uri', uri);
        settings.set_string('picture-uri-dark', uri);
    }

    getWallpaper(): string {
        const settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.background' });
        const uri = settings.get_string('picture-uri');
        console.log(`[GnomeShellAdapter] Current wallpaper: ${uri}`);
        return uri;
    }

    setWifi(enabled: boolean): void {
        // Requires NMClient
        console.log(`Setting Wifi to ${enabled}`);
    }

    async connectToWifi(ssid: string): Promise<boolean> {
        console.log(`Connecting to Wifi ${ssid}`);
        return true;
    }

    getWifiState(): boolean {
        return true; // Mock
    }

    getBatteryLevel(): number {
        // Use UPower
        return 100; // Mock
    }

    isCharging(): boolean {
        return false; // Mock
    }

    getActiveApp(): string | null {
        // @ts-ignore
        const app = this.appSystem.get_running().find(a => a.state === Shell.AppState.RUNNING && a.is_active());
        return app ? app.get_name() : null;
    }

    onActiveAppChanged(callback: (appName: string) => void): void {
        // This is tricky in GJS, usually involves tracking window focus
        // Simplified for this example
        this.appListenerId = global.display.connect('notify::focus-window', () => {
             const app = this.getActiveApp();
             if (app) callback(app);
        });
    }
    
    destroy() {
        if (this.appListenerId) {
            global.display.disconnect(this.appListenerId);
        }
    }
}
