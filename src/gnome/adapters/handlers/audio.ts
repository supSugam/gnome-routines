// @ts-ignore
import Gio from 'gi://Gio';
import debugLog from '../../../utils/log.js';

export class AudioAdapter {
  async setVolume(percentage: number): Promise<void> {
    debugLog(`[AudioAdapter] Setting volume to: ${percentage}%`);
    try {
      const command = [
        'pactl',
        'set-sink-volume',
        '@DEFAULT_SINK@',
        `${percentage}%`,
      ];

      return new Promise((resolve) => {
        try {
          const proc = new Gio.Subprocess({
            argv: command,
            flags: Gio.SubprocessFlags.NONE,
          });
          proc.init(null);
          proc.wait_check_async(null, (proc: any, res: any) => {
            try {
              proc.wait_check_finish(res);
              debugLog(`[AudioAdapter] Volume set command executed`);
            } catch (e) {
              debugLog('[AudioAdapter] Failed to set volume (async):', e);
            }

            resolve();
          });
        } catch (e) {
          debugLog('[AudioAdapter] Failed to spawn set volume:', e);
          resolve();
        }
      });
    } catch (e) {
      debugLog('[AudioAdapter] Failed to set volume:', e);
    }
  }

  getVolume(): Promise<number> {
    return new Promise((resolve) => {
      try {
        const proc = new Gio.Subprocess({
          argv: ['pactl', 'get-sink-volume', '@DEFAULT_SINK@'],
          flags: Gio.SubprocessFlags.STDOUT_PIPE,
        });
        proc.init(null);

        proc.communicate_utf8_async(null, null, (proc: any, res: any) => {
          try {
            const [ok, stdout, stderr] = proc.communicate_utf8_finish(res);
            if (ok && stdout) {
              // Parse output like: "Volume: front-left: 65536 / 100% / 0.00 dB,   front-right: 65536 / 100% / 0.00 dB"
              const match = stdout.match(/(\d+)%/);
              if (match) {
                resolve(parseInt(match[1], 10));
                return;
              }
            }

            resolve(50);
          } catch (e) {
            debugLog('[AudioAdapter] Failed to get volume (async):', e);
            resolve(50);
          }
        });
      } catch (e) {
        debugLog('[AudioAdapter] Failed to initiate get volume:', e);
        resolve(50);
      }
    });
  }

  setBluetoothVolume(percentage: number): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // List sinks to find Bluetooth ones
        const proc = new Gio.Subprocess({
          argv: ['pactl', 'list', 'short', 'sinks'],
          flags: Gio.SubprocessFlags.STDOUT_PIPE,
        });
        proc.init(null);

        proc.communicate_utf8_async(null, null, (proc: any, res: any) => {
          try {
            const [ok, stdout, stderr] = proc.communicate_utf8_finish(res);
            if (!ok || !stdout) {
              resolve(false);
              return;
            }

            const lines = stdout.split('\n');
            let found = false;
            let promises = [];

            for (const line of lines) {
              if (line.includes('bluez_output')) {
                const parts = line.split('\t');
                const sinkName = parts[1];
                debugLog(`[AudioAdapter] Found Bluetooth sink: ${sinkName}`);

                // We need to set volume for this sink
                const subProc = new Gio.Subprocess({
                  argv: [
                    'pactl',
                    'set-sink-volume',
                    sinkName,
                    `${percentage}%`,
                  ],
                  flags: Gio.SubprocessFlags.NONE,
                });
                subProc.init(null);
                found = true;
              }
            }

            resolve(found);
          } catch (e) {
            debugLog(
              '[AudioAdapter] Failed to set Bluetooth volume (async):',
              e
            );
            resolve(false);
          }
        });
      } catch (e) {
        debugLog('[AudioAdapter] Failed to initiate set Bluetooth volume:', e);
        resolve(false);
      }
    });
  }

  getWiredHeadphonesState(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Check if headphone port is active on default sink
        const proc = new Gio.Subprocess({
          argv: ['pactl', 'list', 'sinks'],
          flags: Gio.SubprocessFlags.STDOUT_PIPE,
        });
        proc.init(null);

        proc.communicate_utf8_async(null, null, (proc: any, res: any) => {
          try {
            const [ok, stdout, stderr] = proc.communicate_utf8_finish(res);
            if (!ok || !stdout) {
              resolve(false);
              return;
            }

            // Parse each line looking for "Active Port:" lines
            const lines = stdout.split('\n');
            let isHeadphones = false;

            for (const line of lines) {
              const trimmed = line.trim().toLowerCase();
              if (trimmed.startsWith('active port:')) {
                // Check if the active port contains headphone/headset
                if (
                  trimmed.includes('headphone') ||
                  trimmed.includes('headset')
                ) {
                  isHeadphones = true;
                  break;
                }
              }
            }

            debugLog(`[AudioAdapter] Wired headphones state: ${isHeadphones}`);
            resolve(isHeadphones);
          } catch (e) {
            debugLog('[AudioAdapter] Failed to get headphones state:', e);
            resolve(false);
          }
        });
      } catch (e) {
        debugLog('[AudioAdapter] Failed to check headphones:', e);
        resolve(false);
      }
    });
  }

  onWiredHeadphonesStateChanged(
    callback: (isConnected: boolean) => void
  ): () => void {
    debugLog('[AudioAdapter] Subscribing to wired headphones changes');

    let lastState: boolean | null = null;
    let subprocess: any = null;
    let cancelled = false;

    try {
      // Use pactl subscribe to get real-time events
      subprocess = new Gio.Subprocess({
        argv: ['pactl', 'subscribe'],
        flags: Gio.SubprocessFlags.STDOUT_PIPE,
      });
      subprocess.init(null);

      const stream = subprocess.get_stdout_pipe();
      const dataInputStream = new Gio.DataInputStream({ base_stream: stream });

      const readLine = () => {
        if (cancelled) return;

        dataInputStream.read_line_async(0, null, (stream: any, result: any) => {
          if (cancelled) return;

          try {
            const [line, length] = stream.read_line_finish_utf8(result);
            if (line) {
              // Check for sink events (port changes)
              if (line.includes('sink') && line.includes('change')) {
                // Re-check headphone state
                this.getWiredHeadphonesState().then((isConnected) => {
                  if (lastState !== null && isConnected !== lastState) {
                    debugLog(
                      `[AudioAdapter] Headphones state changed: ${lastState} -> ${isConnected}`
                    );
                    callback(isConnected);
                  }
                  lastState = isConnected;
                });
              }

              readLine(); // Continue reading
            }
          } catch (e) {
            if (!cancelled) {
              debugLog('[AudioAdapter] Error reading pactl output:', e);
            }
          }
        });
      };

      // Get initial state
      this.getWiredHeadphonesState().then((state) => {
        lastState = state;
        debugLog(`[AudioAdapter] Initial headphones state: ${state}`);
        readLine();
      });
    } catch (e) {
      debugLog('[AudioAdapter] Failed to subscribe to headphone changes:', e);
    }

    return () => {
      cancelled = true;
      if (subprocess) {
        try {
          subprocess.force_exit();
          debugLog('[AudioAdapter] Headphones listener stopped');
        } catch (e) {
          debugLog('[AudioAdapter] Error stopping pactl subscribe:', e);
        }
      }
    };
  }
}
