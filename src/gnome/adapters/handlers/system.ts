// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import GLib from 'gi://GLib';
// @ts-ignore
import Shell from 'gi://Shell';
// @ts-ignore
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import debugLog from '../../../utils/log.js';
import { captureScreenshot } from './screenshotPortal.js';

export class SystemAdapter {
  showNotification(notification: {
    title: string;
    message: string;
    urgency?: 'low' | 'normal' | 'critical';
    iconName?: string;
  }): void {
    const title = notification.title || 'GNOME Routines';
    const message = notification.message || '';
    debugLog(`[SystemAdapter] Creating notification: ${title} - ${message}`);
    try {
      // Use Main.notify
      (Main as any).notify(title, message);
      debugLog('[SystemAdapter] Notification shown successfully');
    } catch (e: any) {
      debugLog(
        `[SystemAdapter] Failed to show notification: ${
          e?.message || e?.toString() || JSON.stringify(e)
        }`
      );
      throw e;
    }
  }

  setDND(enabled: boolean): void {
    debugLog(`[SystemAdapter] Setting DND to: ${enabled}`);
    // GSettings DND
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
    debugLog('[SystemAdapter] Subscribing to DND state changes');
    const settings = new Gio.Settings({
      schema_id: 'org.gnome.desktop.notifications',
    });

    // Retain settings
    const settingsRef = settings;

    const id = settingsRef.connect('changed::show-banners', () => {
      const dnd = !settingsRef.get_boolean('show-banners');
      debugLog(`[SystemAdapter] DND state changed: ${dnd}`);
      callback(dnd);
    });

    return () => {
      try {
        settingsRef.disconnect(id);
        debugLog('[SystemAdapter] DND listener disconnected');
      } catch (e) {
        debugLog('[SystemAdapter] Error disconnecting DND listener:', e);
      }
    };
  }

  executeCommand(command: string): void {
    debugLog(`[SystemAdapter] Executing command (shell): ${command}`);
    try {
      // Interactive bash
      const homeDir = GLib.get_home_dir();
      const argv = ['bash', '--rcfile', `${homeDir}/.bashrc`, '-ic', command];

      // Use SubprocessLauncher to set environment variables
      const launcher = new Gio.SubprocessLauncher({
        flags:
          Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
      });

      // GUI env vars
      launcher.setenv('TERM', 'xterm-256color', true);
      launcher.setenv('DISPLAY', GLib.getenv('DISPLAY') || ':0', true);
      launcher.setenv(
        'WAYLAND_DISPLAY',
        GLib.getenv('WAYLAND_DISPLAY') || '',
        true
      );
      launcher.setenv('XDG_RUNTIME_DIR', GLib.get_user_runtime_dir(), true);
      const dbusAddr = GLib.getenv('DBUS_SESSION_BUS_ADDRESS');
      if (dbusAddr) {
        launcher.setenv('DBUS_SESSION_BUS_ADDRESS', dbusAddr, true);
      }
      // Inherit HOME for proper shell initialization
      launcher.setenv('HOME', GLib.get_home_dir(), true);

      const proc = launcher.spawnv(argv);

      // Wait async
      proc.wait_async(null, (proc: any, res: any) => {
        try {
          proc.wait_finish(res);
          const exitCode = proc.get_exit_status();
          debugLog(
            `[SystemAdapter] Command finished with exit code: ${exitCode}`
          );
        } catch (e) {
          debugLog('[SystemAdapter] Error waiting for command:', e);
        }
      });
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
      // Exact ID lookup
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
    } catch (_e) {
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
