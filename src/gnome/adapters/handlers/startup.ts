// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import GLib from 'gi://GLib';
import debugLog from '../../../utils/log.js';

export class StartupAdapter {
  private _isStartup: boolean = false;
  private _initTime: number;

  constructor() {
    this._initTime = Date.now();
    this._checkStartupState();
  }

  private _checkStartupState() {
    try {
      const runtimeDir = GLib.get_user_runtime_dir();
      const lockFilePath = `${runtimeDir}/gnome-routines-session.lock`;
      const file = Gio.File.new_for_path(lockFilePath);

      if (file.query_exists(null)) {
        // Already exists, so not startup
        debugLog('[StartupAdapter] Session lock file exists, not startup.');
        this._isStartup = false;
      } else {
        // Startup detected
        debugLog('[StartupAdapter] Session lock file missing, is startup.');
        this._isStartup = true;

        // Lock file
        try {
          const stream = file.create(Gio.FileCreateFlags.NONE, null);
          stream.close(null);
          debugLog(
            `[StartupAdapter] Created session lock file at ${lockFilePath}`
          );
        } catch (e) {
          debugLog('[StartupAdapter] Failed to create lock file:', e);
        }
      }
    } catch (e) {
      debugLog('[StartupAdapter] Error checking startup state:', e);
      this._isStartup = false;
    }
  }

  getStartupState(): { isStartup: boolean; timeSinceInit: number } {
    return {
      isStartup: this._isStartup,
      timeSinceInit: Date.now() - this._initTime,
    };
  }

  // Deprecated
  writeLockFile(): void {
    // Logic moved to constructor
  }
}
