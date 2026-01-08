// @ts-ignore
import GLib from 'gi://GLib';
// @ts-ignore
import Gio from 'gi://Gio';
import { EXTENSION_DEFAULTS } from '../data/constants.js';

let logStream: any = null;

function getLogStream() {
  if (logStream) return logStream;
  try {
    const cacheDir = GLib.get_user_cache_dir();
    const logDir = GLib.build_filenamev([cacheDir, EXTENSION_DEFAULTS.log.dir]);

    if (GLib.mkdir_with_parents(logDir, 0o755) !== 0) {
      // Ignore error
    }

    // Cleanup temp
    try {
      const dir = Gio.File.new_for_path(logDir);
      const enumerator = dir.enumerate_children(
        'standard::name',
        Gio.FileQueryInfoFlags.NONE,
        null
      );
      let fileInfo;
      while ((fileInfo = enumerator.next_file(null))) {
        const name = fileInfo.get_name();
        if (name.startsWith('.goutputstream')) {
          const tempFile = dir.get_child(name);
          try {
            tempFile.delete(null);
          } catch (_e) {
            // Ignore delete
          }
        }
      }
    } catch (_e) {
      // Ignore cleanup
    }

    const logFile = GLib.build_filenamev([
      logDir,
      EXTENSION_DEFAULTS.log.fileName,
    ]);
    const file = Gio.File.new_for_path(logFile);

    // Append
    logStream = file.append_to(Gio.FileCreateFlags.NONE, null);
    return logStream;
  } catch (e) {
    debugLog('[GnomeRoutines] Failed to create log stream:', e);
    return null;
  }
}

export default function debugLog(message: string, ...args: any[]) {
  const d = new Date();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();

  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM/PM

  const pad = (num: number) => num.toString().padStart(2, '0');

  const timestamp = `[${pad(displayHours)}:${pad(minutes)}:${pad(
    seconds
  )} ${ampm}]`;
  const argsStr = args
    .map((a: any) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
    .join(' ');
  const fullMessage = `GR-DEBUG -- ${timestamp} ${message} ${argsStr}`;

  // Console
  console.log(fullMessage);

  // File
  if (EXTENSION_DEFAULTS.log.saveToFile) {
    try {
      const stream = getLogStream();
      if (stream) {
        stream.write_all(fullMessage + '\n', null);
        stream.flush(null); // Ensure write
      }
    } catch (e) {
      debugLog('Failed to write to log file:', e);
    }
  }
}

export function startFreshLog() {
  const stream = getLogStream();
  if (stream) {
    try {
      stream.truncate(0, null);
    } catch (_e) {
      // Ignore fail
    }
  }
}

export function closeLog() {
  if (logStream) {
    try {
      logStream.close(null);
    } catch (e) {
      debugLog('Failed to close log stream:', e);
    }
    logStream = null;
  }
}
