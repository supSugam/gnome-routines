// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import GLib from 'gi://GLib';
import debugLog from '../../../utils/log.js';

export class StartupAdapter {
    getStartupState(): Promise<boolean> {
        return new Promise((resolve) => {
            try {
                // Ensure caching/efficient check as requested in previous guidelines
                // The lock file approach: if file DOES NOT exist in current runtime dir, it's startup.
                // Then we create it.
                // BUT: runtime dir (/run/user/1000) is cleared on reboot/logout.
                
                const runtimeDir = GLib.get_user_runtime_dir();
                const lockFilePath = `${runtimeDir}/gnome-routines-session.lock`;
                const file = Gio.File.new_for_path(lockFilePath);

                if (file.query_exists(null)) {
                    // Already exists, so not startup
                    debugLog('[StartupAdapter] Session lock file exists, not startup.');
                    resolve(false);
                } else {
                    // Does not exist, it IS startup
                    debugLog('[StartupAdapter] Session lock file missing, is startup.');
                    resolve(true);
                }
            } catch (e) {
                debugLog('[StartupAdapter] Error checking startup state:', e);
                resolve(false);
            }
        });
    }

    writeLockFile(): void {
        try {
            const runtimeDir = GLib.get_user_runtime_dir();
            const lockFilePath = `${runtimeDir}/gnome-routines-session.lock`;
            const file = Gio.File.new_for_path(lockFilePath);
            
            if (!file.query_exists(null)) {
                // Create empty file
                const stream = file.create(Gio.FileCreateFlags.NONE, null);
                stream.close(null);
                debugLog(`[StartupAdapter] Created session lock file at ${lockFilePath}`);
            }
        } catch (e) {
            debugLog('[StartupAdapter] Failed to write lock file:', e);
        }
    }
}
