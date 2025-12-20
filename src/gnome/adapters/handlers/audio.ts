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
                                debugLog(
                                    `[AudioAdapter] Found Bluetooth sink: ${sinkName}`
                                );

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
                debugLog(
                    '[AudioAdapter] Failed to initiate set Bluetooth volume:',
                    e
                );
                resolve(false);
            }
        });
    }
}
