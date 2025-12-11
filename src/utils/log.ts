// @ts-ignore
import GLib from 'gi://GLib';
// @ts-ignore
import Gio from 'gi://Gio';

// Set to true for production debugging if needed, or control via setting
const DEBUG = false;
const LOG_TO_FILE = false;

let logStream: any = null;

function getLogStream() {
  if (logStream) return logStream;
  try {
    const cacheDir = GLib.get_user_cache_dir();
    const logDir = GLib.build_filenamev([cacheDir, 'gnome-routines']);

    if (GLib.mkdir_with_parents(logDir, 0o755) !== 0) {
      // Ignore error if exists
    }

    const sessionId =
      GLib.getenv('XDG_SESSION_ID') || `${new Date().getTime()}`;
    const fileName = `debug-session-${sessionId}.log`;
    const logFile = GLib.build_filenamev([logDir, fileName]);
    const file = Gio.File.new_for_path(logFile);

    // Append mode
    logStream = file.append_to(Gio.FileCreateFlags.NONE, null);
    return logStream;
  } catch (e) {
    console.error('[GnomeRoutines] Failed to create log stream:', e);
    return null;
  }
}

export default function debugLog(message: string, ...args: any[]) {
  // Always log ERRORs or critical info marked with [GnomeRoutines-DEBUG] regardless of DEBUG flag?
  // For now stick to DEBUG constant.
  if (!DEBUG && !message.includes('[GnomeRoutines-DEBUG]')) return;

  const d = new Date();
  const timestamp = d.toISOString();
  const argsStr = args
    .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
    .join(' ');
  const fullMessage = `[${timestamp}] ${message} ${argsStr}`;

  // Console output
  console.log(fullMessage);

  // File output
  if (LOG_TO_FILE) {
    try {
      const stream = getLogStream();
      if (stream) {
        stream.write_all(fullMessage + '\n', null);
        stream.flush(null); // Ensure write
      }
    } catch (e) {
      console.error('Failed to write to log file:', e);
    }
  }
}
