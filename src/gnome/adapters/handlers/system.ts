// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import GLib from 'gi://GLib';
// @ts-ignore
import Shell from 'gi://Shell';
import debugLog from '../../../utils/log.js';
import { captureScreenshot } from './screenshotPortal.js';

declare const imports: any;

export class SystemAdapter {
    showNotification(notification: {
        title: string;
        message: string;
        urgency?: 'low' | 'normal' | 'critical';
        iconName?: string;
    }): void {
        const source = new imports.ui.messageTray.SystemNotificationSource();
        imports.ui.main.messageTray.add(source);
        const notificationObj = new imports.ui.messageTray.Notification(
          source,
          notification.title,
          notification.message,
          {
             iconName: notification.iconName || 'dialog-information',
             urgency: notification.urgency === 'critical' 
                 ? imports.ui.messageTray.Urgency.CRITICAL 
                 : notification.urgency === 'low'
                   ? imports.ui.messageTray.Urgency.LOW
                   : imports.ui.messageTray.Urgency.NORMAL
          }
        );
        notificationObj.setTransient(true);
        source.notify(notificationObj);
    }

    setDND(enabled: boolean): void {
        debugLog(`[SystemAdapter] Setting DND to: ${enabled}`);
        // GNOME 45+ uses GSettings for DND (notifications)
        const settings = new Gio.Settings({
            schema_id: 'org.gnome.desktop.notifications',
        });
        settings.set_boolean('show-banners', !enabled);
    }

    getDND(): boolean {
        const settings = new Gio.Settings({
            schema_id: 'org.gnome.desktop.notifications',
        });
        return !settings.get_boolean('show-banners');
    }

    onDndStateChanged(callback: (isEnabled: boolean) => void): () => void {
        const settings = new Gio.Settings({
            schema_id: 'org.gnome.desktop.notifications',
        });
        const id = settings.connect('changed::show-banners', () => {
            const dnd = !settings.get_boolean('show-banners');
            debugLog(`[SystemAdapter] DND state changed: ${dnd}`);
            callback(dnd);
        });
        return () => {
            settings.disconnect(id);
        };
    }

    executeCommand(command: string): void {
        debugLog(`[SystemAdapter] Executing command: ${command}`);
        try {
            // We must parse the command string into argv
            const [ok, argv] = GLib.shell_parse_argv(command);
            if (!ok || !argv) {
                debugLog('[SystemAdapter] Failed to parse command argv');
                return;
            }

            const proc = new Gio.Subprocess({
                argv: argv,
                flags: Gio.SubprocessFlags.NONE,
            });
            proc.init(null);
        } catch (e) {
            debugLog('[SystemAdapter] Failed to spawn command:', e);
        }
    }

    openApp(appId: string): void {
        debugLog(`[SystemAdapter] Opening app: ${appId}`);
        const appSys = Shell.AppSystem.get_default();
        const app = appSys.lookup_app(appId);
        if (app) {
            app.activate();
        } else {
            debugLog(`[SystemAdapter] App not found: ${appId}`);
            // Try simpler lookup or partial match if needed, but ID should be exact from .desktop
        }
    }

    openLink(url: string): void {
        debugLog(`[SystemAdapter] Opening link: ${url}`);
        try {
            Gio.AppInfo.launch_default_for_uri(url, null);
        } catch (e) {
            debugLog('[SystemAdapter] Failed to open link:', e);
        }
    }
    
    takeScreenshot(filename: string): void {
        const targetDir =
        GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES) ||
        `${GLib.get_home_dir()}/Pictures`;
        
        let finalFilename = filename;
        if (!finalFilename) {
             const now = GLib.DateTime.new_now_local();
             finalFilename = `Screenshot from ${now.format('%Y-%m-%d %H-%M-%S')}.png`;
        }
        
        const fullPath = `${targetDir}/Screenshots/${finalFilename}`;
        // Ensure dir exists
        const dirFile = Gio.File.new_for_path(`${targetDir}/Screenshots`);
        try {
            if (!dirFile.query_exists(null)) {
                dirFile.make_directory_with_parents(null);
            }
        } catch (e) {
            // ignore
        }

        debugLog(`[SystemAdapter] Taking screenshot (Portal) -> ${fullPath}`);

        captureScreenshot()
        .then((uri: string) => {
            if (!uri) return;
            debugLog(`[SystemAdapter] Portal screenshot success: ${uri}`);
            
            try {
                const srcFile = Gio.File.new_for_uri(uri);
                const destFile = Gio.File.new_for_path(fullPath);
                
                srcFile.move(destFile, Gio.FileCopyFlags.OVERWRITE, null, null);
                
                debugLog(`[SystemAdapter] Moved screenshot to: ${fullPath}`);
                this.showNotification({
                    title: 'Screenshot Saved',
                    message: `Saved to ${finalFilename}`,
                    urgency: 'low',
                    iconName: 'camera-photo-symbolic',
                });
            } catch (moveErr) {
                debugLog('[SystemAdapter] Failed to move screenshot file:', moveErr);
                this.showNotification({
                    title: 'Screenshot Saved',
                    message: `Saved (portal default location)`,
                    urgency: 'low',
                    iconName: 'camera-photo-symbolic',
                });
            }
        })
        .catch((err: any) => {
            debugLog('[SystemAdapter] Portal screenshot failed:', err);
             this.showNotification({
               title: 'Screenshot Failed',
               message: err.message || 'Capture Error',
             });
        });
    }
}
