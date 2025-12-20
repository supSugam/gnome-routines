// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import GLib from 'gi://GLib';
import debugLog from '../../../utils/log.js';

export class PowerAdapter {
    setPowerSaver(enabled: boolean): void {
        const mode = enabled ? 'power-saver' : 'balanced';
        debugLog(`[PowerAdapter] Setting power profile to: ${mode}`);
        try {
            // Use powerprofilesctl
            const proc = new Gio.Subprocess({
                argv: ['powerprofilesctl', 'set', mode],
                flags: Gio.SubprocessFlags.NONE,
            });
            proc.init(null);
            proc.wait_check_async(null, (proc: any, res: any) => {
                try {
                    proc.wait_check_finish(res);
                    debugLog(`[PowerAdapter] Power profile set to ${mode}`);
                } catch (e) {
                    debugLog('[PowerAdapter] Failed to set power profile (async):', e);
                }
            });
        } catch (e) {
            debugLog('[PowerAdapter] Failed to initiate set power profile:', e);
        }
    }

    getPowerSaver(): boolean {
        // Since we can't easily sync-read stdout without blocking, we rely on cached assumptions or async checks
        // For sync-api compatibility, this might be tricky.
        // However, the original code used sync spawn_command_line_sync which is bad.
        // Let's use a cached property approach or try to read a file if possible?
        // No easy file for power-profiles-daemon.
        
        // Let's use DBus sync call (it's internal network, usually fast, though technically blocking)
        try {
             // org.freedesktop.UPower.PowerProfiles ? No, it's net.hadess.PowerProfiles
             const result = Gio.DBus.system.call_sync(
                 'net.hadess.PowerProfiles',
                 '/net/hadess/PowerProfiles',
                 'org.freedesktop.DBus.Properties',
                 'Get',
                 new GLib.Variant('(ss)', ['net.hadess.PowerProfiles', 'ActiveProfile']),
                 null,
                 Gio.DBusCallFlags.NONE,
                 -1,
                 null
             );
             const variant = result.get_child_value(0);
             const activeProfile = variant.get_variant().get_string()[0];
             return activeProfile === 'power-saver';

        } catch(e) {
            debugLog('[PowerAdapter] Failed to get power profile sync via DBus, trying UPower fallback or default', e);
            return false;
        }
    }
}
