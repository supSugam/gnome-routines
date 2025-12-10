import debugLog from '../../utils/log.js';
import { SystemAdapter } from './adapter.js';

// @ts-ignore
import Shell from 'gi://Shell';
// @ts-ignore
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
// @ts-ignore
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import GLib from 'gi://GLib';
// @ts-ignore
import St from 'gi://St';
// @ts-ignore
import NM from 'gi://NM';
// @ts-ignore
import UPower from 'gi://UPowerGlib';

declare const global: any;

export class GnomeShellAdapter implements SystemAdapter {
  private appSystem: any;
  private appListenerId: number = 0;
  private initTimestamp: number;
  private isStartupSession: boolean = false;

  constructor() {
    this.appSystem = Shell.AppSystem.get_default();
    this.initTimestamp = Date.now();
    this.checkStartupState();
  }

  private checkStartupState() {
    try {
      const runtimeDir = GLib.get_user_runtime_dir();
      debugLog(
        `[GnomeRoutines-DEBUG] Checking startup state in: ${runtimeDir}`
      );
      const lockFilePath = GLib.build_filenamev([
        runtimeDir,
        'gnome-routines-startup.lock',
      ]);
      const file = Gio.File.new_for_path(lockFilePath);

      const sessionId = GLib.getenv('XDG_SESSION_ID') || 'unknown';
      debugLog(`[GnomeRoutines-DEBUG] Current XDG_SESSION_ID: ${sessionId}`);

      if (file.query_exists(null)) {
        debugLog(
          '[GnomeRoutines-DEBUG] Startup lock file exists. Checking validity...'
        );

        let isFresh = false;
        try {
          const [success, contents] = file.load_contents(null);
          if (success) {
            const decoder = new TextDecoder();
            const contentStr = decoder.decode(contents).trim();
            debugLog(`[GnomeRoutines-DEBUG] Lock file content: ${contentStr}`);

            let storedSessionId = '';
            let fileTime = NaN;

            // Try to parse as JSON first
            try {
              const json = JSON.parse(contentStr);
              if (json.sessionId) storedSessionId = json.sessionId;
              if (json.timestamp) fileTime = Date.parse(json.timestamp);
            } catch (jsonErr) {
              // Fallback to legacy date string
              fileTime = Date.parse(contentStr);
            }

            if (storedSessionId && storedSessionId === sessionId) {
              debugLog(
                '[GnomeRoutines-DEBUG] Session ID MATCHES. This is the same session re-initializing (e.g. shell restart).'
              );
              // Same session. Logic:
              // If it's a shell restart, we generally DON'T want to fire triggers again (to avoid duplicates).
              // BUT, if the restart happened very quickly after login (e.g. < 60s), maybe the first run didn't finish?
              // Let's stick to strict "Run Once Per Session ID".
              // So if IDs match, we do NOT run.
              isFresh = false;
            } else {
              if (sessionId !== 'unknown') {
                debugLog(
                  `[GnomeRoutines-DEBUG] Session ID MISMATCH (${storedSessionId} vs ${sessionId}). Treating as NEW session (Stale lock file).`
                );
                isFresh = true;
              } else {
                // Fallback if no session ID available (rare)
                // Check timestamp age
                const now = Date.now();
                if (!isNaN(fileTime)) {
                  const diff = now - fileTime;
                  debugLog(
                    `[GnomeRoutines-DEBUG] Time since lock creation: ${diff}ms (No Session ID available)`
                  );
                  // If > 5 minutes, assume stale
                  if (diff > 300000) {
                    isFresh = true;
                    debugLog(
                      '[GnomeRoutines-DEBUG] Stale lock file (>5m). Treating as fresh.'
                    );
                  }
                } else {
                  // Corrupt content? Overwrite.
                  isFresh = true;
                }
              }
            }
          }
        } catch (readError) {
          debugLog(
            `[GnomeRoutines-DEBUG] Could not read lock file content: ${readError}`
          );
          // If we can't read it, assume it's broken and we should take over?
          // Or failsafe off? Let's take over.
          isFresh = true;
        }

        if (isFresh) {
          debugLog(
            '[GnomeRoutines-DEBUG] Taking ownership of lock file for new session.'
          );
          this.writeLockFile(file, sessionId);
          this.isStartupSession = true;
        } else {
          this.isStartupSession = false;
        }
      } else {
        debugLog(
          '[GnomeRoutines-DEBUG] No startup lock file found. Creating one. This IS a fresh login session.'
        );
        this.writeLockFile(file, sessionId);
        this.isStartupSession = true;
      }
    } catch (e) {
      console.error(
        '[GnomeRoutines-DEBUG] Failed to check/create startup lock file:',
        e
      );
      // Fallback: If we can't write, assume we can't track sessions correctly.
      // But maybe safer to assume FALSE to avoid spamming if file system is readonly?
      // Or TRUE if we want to ensure it runs at least once?
      // Defaulting to false to be safe against loops.
      this.isStartupSession = false;
    }
  }

  private writeLockFile(file: any, sessionId: string) {
    try {
      // Overwrite
      const outputStream = file.replace(
        null,
        false,
        Gio.FileCreateFlags.NONE,
        null
      );
      const encoder = new TextEncoder();
      const data = JSON.stringify({
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
      });
      const content = encoder.encode(data);
      outputStream.write_all(content, null);
      outputStream.close(null);
    } catch (e) {
      debugLog(`[GnomeRoutines-DEBUG] Failed to write lock file: ${e}`);
    }
  }

  getStartupState(): { isStartup: boolean; timeSinceInit: number } {
    return {
      isStartup: this.isStartupSession,
      timeSinceInit: Date.now() - this.initTimestamp,
    };
  }

  showNotification(title: string, body: string): void {
    const source = new MessageTray.Source(
      'Gnome Routines',
      'system-run-symbolic'
    );
    Main.messageTray.add(source);
    const notification = new MessageTray.Notification(source, title, body);
    source.notify(notification);
  }

  setDND(enabled: boolean): void {
    debugLog(`[GnomeShellAdapter] Setting DND to: ${enabled}`);
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

  setBrightness(percentage: number): void {
    debugLog(`[GnomeShellAdapter] Setting brightness to: ${percentage}%`);
    try {
      // GNOME uses GSD Power interface via DBus for brightness
      // For simplicity, we'll use the backlight interface if available
      const BrightnessProxy = Gio.DBusProxy.makeProxyWrapper(`
        <node>
          <interface name="org.gnome.SettingsDaemon.Power.Screen">
            <property name="Brightness" type="i" access="readwrite"/>
          </interface>
        </node>
      `);

      const proxy = new BrightnessProxy(
        Gio.DBus.session,
        'org.gnome.SettingsDaemon.Power',
        '/org/gnome/SettingsDaemon/Power'
      );

      // Brightness is typically 0-100
      proxy.Brightness = Math.max(0, Math.min(100, percentage));
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to set brightness:', e);
    }
  }

  getBrightness(): number {
    try {
      const BrightnessProxy = Gio.DBusProxy.makeProxyWrapper(`
        <node>
          <interface name="org.gnome.SettingsDaemon.Power.Screen">
            <property name="Brightness" type="i" access="readwrite"/>
          </interface>
        </node>
      `);

      const proxy = new BrightnessProxy(
        Gio.DBus.session,
        'org.gnome.SettingsDaemon.Power',
        '/org/gnome/SettingsDaemon/Power'
      );

      return proxy.Brightness || 100;
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to get brightness:', e);
      return 100;
    }
  }

  async setVolume(percentage: number): Promise<void> {
    debugLog(`[GnomeShellAdapter] Setting volume to: ${percentage}%`);
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
              debugLog(`[GnomeShellAdapter] Volume set command executed`);
            } catch (e) {
              console.error(
                '[GnomeShellAdapter] Failed to set volume (async):',
                e
              );
            }
            resolve();
          });
        } catch (e) {
          console.error('[GnomeShellAdapter] Failed to spawn set volume:', e);
          resolve();
        }
      });
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to set volume:', e);
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
            console.error(
              '[GnomeShellAdapter] Failed to get volume (async):',
              e
            );
            resolve(50);
          }
        });
      } catch (e) {
        console.error('[GnomeShellAdapter] Failed to initiate get volume:', e);
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
                  `[GnomeShellAdapter] Found Bluetooth sink: ${sinkName}`
                );

                // We need to set volume for this sink
                // We can fire and forget, or wait. Let's fire and forget for individual sinks but track if we found any.
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
                // No need to wait for completion for the return value, but good for cleanup
                found = true;
              }
            }
            resolve(found);
          } catch (e) {
            console.error(
              '[GnomeShellAdapter] Failed to set Bluetooth volume (async):',
              e
            );
            resolve(false);
          }
        });
      } catch (e) {
        console.error(
          '[GnomeShellAdapter] Failed to initiate set Bluetooth volume:',
          e
        );
        resolve(false);
      }
    });
  }

  setSinkVolume(sinkName: string, percentage: number): void {
    // Legacy support if needed
    try {
      const command = `pactl set-sink-volume ${sinkName} ${percentage}%`;
      GLib.spawn_command_line_async(command);
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to set sink volume:', e);
    }
  }

  getBluetoothAudioSinkName(): string | null {
    // Re-implement if needed, but setBluetoothVolume handles it now
    return null;
  }

  setWallpaper(uri: string): void {
    debugLog(`[GnomeShellAdapter] Setting wallpaper to: ${uri}`);
    const settings = new Gio.Settings({
      schema_id: 'org.gnome.desktop.background',
    });
    settings.set_string('picture-uri', uri);
    settings.set_string('picture-uri-dark', uri);
  }

  getWallpaper(): string {
    const settings = new Gio.Settings({
      schema_id: 'org.gnome.desktop.background',
    });
    const uri = settings.get_string('picture-uri');
    debugLog(`[GnomeShellAdapter] Current wallpaper: ${uri}`);
    return uri;
  }

  setBluetooth(enabled: boolean): Promise<void> {
    debugLog(`[GnomeShellAdapter] Setting Bluetooth to: ${enabled}`);
    return new Promise((resolve) => {
      try {
        // Use bluetoothctl (BlueZ control) - most reliable method
        const command = enabled
          ? ['bluetoothctl', 'power', 'on']
          : ['bluetoothctl', 'power', 'off'];

        const proc = new Gio.Subprocess({
          argv: command,
          flags: Gio.SubprocessFlags.NONE,
        });
        proc.init(null);
        proc.wait_check_async(null, (proc: any, res: any) => {
          try {
            proc.wait_check_finish(res);
            debugLog(
              `[GnomeShellAdapter] Bluetooth ${
                enabled ? 'enabled' : 'disabled'
              } via bluetoothctl`
            );
          } catch (e) {
            console.warn(
              `[GnomeShellAdapter] bluetoothctl failed, trying rfkill: ${e}`
            );
            // Fallback to rfkill
            const rfkillCommand = enabled
              ? 'rfkill unblock bluetooth'
              : 'rfkill block bluetooth';
            GLib.spawn_command_line_async(rfkillCommand);
          }
          resolve();
        });
      } catch (e) {
        console.error('[GnomeShellAdapter] Failed to set Bluetooth:', e);
        // Try rfkill as last resort
        try {
          const rfkillCommand = enabled
            ? 'rfkill unblock bluetooth'
            : 'rfkill block bluetooth';
          GLib.spawn_command_line_async(rfkillCommand);
        } catch (err) {
          console.error('[GnomeShellAdapter] rfkill fallback failed:', err);
        }
        resolve();
      }
    });
  }

  async getBluetooth(): Promise<boolean> {
    // We can use bluetoothctl show or DBus
    // Using DBus is faster for state checks
    try {
      const proxy = new Gio.DBusProxy({
        g_connection: Gio.DBus.system,
        g_name: 'org.bluez',
        g_object_path: '/org/bluez/hci0',
        g_interface_name: 'org.bluez.Adapter1',
      });

      // Try DBus property read first
      const result = proxy.get_cached_property('Powered');
      if (result) {
        return result.get_boolean();
      }

      // Fallback to bluetoothctl if DBus fails or not cached
      return new Promise((resolve) => {
        const proc = new Gio.Subprocess({
          argv: ['bluetoothctl', 'show'],
          flags: Gio.SubprocessFlags.STDOUT_PIPE,
        });
        proc.init(null);

        proc.communicate_utf8_async(null, null, (proc: any, res: any) => {
          try {
            const [ok, stdout, stderr] = proc.communicate_utf8_finish(res);
            if (ok && stdout) {
              const match = stdout.match(/Powered:\s*(yes|no)/i);
              if (match) {
                resolve(match[1].toLowerCase() === 'yes');
                return;
              }
            }
            resolve(false);
          } catch (e) {
            console.error(
              '[GnomeShellAdapter] Failed to get Bluetooth state (async):',
              e
            );
            resolve(false);
          }
        });
      });
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to get Bluetooth power:', e);
      return false;
    }
  }

  setWifi(enabled: boolean): void {
    debugLog(`[GnomeShellAdapter] Setting Wifi to ${enabled}`);
    try {
      const cmd = enabled ? 'nmcli radio wifi on' : 'nmcli radio wifi off';
      GLib.spawn_command_line_async(cmd);
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to set Wifi:', e);
    }
  }

  async connectToWifi(ssid: string): Promise<boolean> {
    debugLog(`[GnomeShellAdapter] Connecting to Wifi ${ssid}`);
    try {
      // nmcli device wifi connect <ssid>
      // This is blocking and might take time.
      // We should probably use async spawn but we need result.
      // For now, use sync but with timeout if possible? No, sync blocks shell.
      // Use async and return true (optimistic) or implement proper async wrapper.
      // Since we have retry logic in Action, we can just trigger it here.

      // Use connection up to activate existing profile by name (SSID/ID)
      const cmd = `nmcli connection up "${ssid}"`;
      GLib.spawn_command_line_async(cmd);
      return true;
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to connect to Wifi:', e);
      return false;
    }
  }

  // Network Tracking
  getWifiState(): boolean {
    try {
      const client = NM.Client.new(null);
      if (!client) return false;

      const connections = client.get_active_connections();
      for (let i = 0; i < connections.length; i++) {
        const conn = connections[i];
        const devices = conn.get_devices();
        if (devices && devices.length > 0) {
          // NM.DeviceType.WIFI = 2
          if (devices[0].get_device_type() === 2) {
            return true;
          }
        }
      }
      return false;
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to get Wifi state:', e);
      return false;
    }
  }

  onWifiStateChanged(callback: (isConnected: boolean) => void): void {
    try {
      const client = NM.Client.new(null);
      if (client) {
        // Listen for changes in active connections
        client.connect('notify::active-connections', () => {
          const isConnected = this.getWifiState();
          callback(isConnected);
        });
      }
    } catch (e) {
      console.error(
        '[GnomeShellAdapter] Failed to subscribe to Wifi changes:',
        e
      );
    }
  }

  getCurrentWifiSSID(): string | null {
    try {
      const client = NM.Client.new(null);
      if (!client) return null;

      const connections = client.get_active_connections();
      for (let i = 0; i < connections.length; i++) {
        const conn = connections[i];
        const devices = conn.get_devices();
        if (devices && devices.length > 0) {
          if (devices[0].get_device_type() === 2) {
            // WIFI
            // Get the connection ID (SSID usually matches this for wifi)
            return conn.get_id();
          }
        }
      }
      return null;
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to get Wifi SSID:', e);
      return null;
    }
  }

  getSavedWifiNetworks(): string[] {
    try {
      const client = NM.Client.new(null);
      if (!client) return [];

      const connections = client.get_connections();
      const ssids: string[] = [];

      for (let i = 0; i < connections.length; i++) {
        const conn = connections[i];
        // Check if it's a wifi connection (type '802-11-wireless')
        if (conn.get_connection_type() === '802-11-wireless') {
          const id = conn.get_id();
          if (id && !ssids.includes(id)) {
            ssids.push(id);
          }
        }
      }
      return ssids.sort();
    } catch (e) {
      console.error(
        '[GnomeShellAdapter] Failed to get saved Wifi networks:',
        e
      );
      return [];
    }
  }

  // --- New Actions Implementation ---

  connectBluetoothDevice(id: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        let mac = id;
        // If id is not a MAC address (e.g. alias), try to resolve it via DBus
        if (!id.includes(':')) {
          // We can use the ObjectManager logic we implemented in getConnectedBluetoothDevices
          // But for now, let's assume the user provides a MAC or we can't easily resolve it without a full scan.
          // Actually, we can try to connect to the alias directly? No, bluetoothctl needs MAC usually.
          // Let's try to resolve it using async bluetoothctl devices list if needed, OR just assume MAC for now to be safe/fast.
          // The user said "selected (already known bluetooth device)".
          // If we want to be robust, we should implement async resolution.

          const proc = new Gio.Subprocess({
            argv: ['bluetoothctl', 'devices'],
            flags: Gio.SubprocessFlags.STDOUT_PIPE,
          });
          proc.init(null);
          proc.communicate_utf8_async(null, null, (proc: any, res: any) => {
            try {
              const [ok, stdout, stderr] = proc.communicate_utf8_finish(res);
              if (ok && stdout) {
                const lines = stdout.split('\n');
                for (const line of lines) {
                  if (line.includes(id)) {
                    const match = line.match(/^Device\s+([0-9A-F:]+)\s+(.+)$/i);
                    if (match && match[2] === id) {
                      mac = match[1];
                      break;
                    }
                  }
                }
              }
            } catch (e) {
              console.error(
                '[GnomeShellAdapter] Failed to resolve bluetooth device (async):',
                e
              );
            }

            // Proceed to connect with resolved MAC or original ID
            const connectProc = new Gio.Subprocess({
              argv: ['bluetoothctl', 'connect', mac],
              flags: Gio.SubprocessFlags.NONE,
            });
            connectProc.init(null);
            resolve();
          });
          return;
        }

        // If it looks like a MAC, just connect
        const connectProc = new Gio.Subprocess({
          argv: ['bluetoothctl', 'connect', mac],
          flags: Gio.SubprocessFlags.NONE,
        });
        connectProc.init(null);
        resolve();
      } catch (e) {
        console.error(
          '[GnomeShellAdapter] Failed to connect bluetooth device:',
          e
        );
        resolve();
      }
    });
  }

  disconnectBluetoothDevice(id: string): void {
    try {
      let mac = id;
      if (!id.includes(':')) {
        // Same lookup logic as connect
        const [success, stdout] = GLib.spawn_command_line_sync(
          'bluetoothctl devices'
        );
        if (success && stdout) {
          const output = new TextDecoder().decode(stdout);
          const lines = output.split('\n');
          for (const line of lines) {
            if (line.includes(id)) {
              const match = line.match(/^Device\s+([0-9A-F:]+)\s+(.+)$/i);
              if (match && match[2] === id) {
                mac = match[1];
                break;
              }
            }
          }
        }
      }
      GLib.spawn_command_line_async(`bluetoothctl disconnect ${mac}`);
    } catch (e) {
      console.error(
        '[GnomeShellAdapter] Failed to disconnect bluetooth device:',
        e
      );
    }
  }

  setAirplaneMode(enabled: boolean): void {
    try {
      // rfkill block all / unblock all
      const cmd = enabled ? 'rfkill block all' : 'rfkill unblock all';
      GLib.spawn_command_line_async(cmd);
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to set airplane mode:', e);
    }
  }

  setDarkMode(enabled: boolean): void {
    const settings = new Gio.Settings({
      schema_id: 'org.gnome.desktop.interface',
    });
    settings.set_string('color-scheme', enabled ? 'prefer-dark' : 'default');
  }

  getDarkMode(): boolean {
    const settings = new Gio.Settings({
      schema_id: 'org.gnome.desktop.interface',
    });
    return settings.get_string('color-scheme') === 'prefer-dark';
  }

  setNightLight(enabled: boolean): void {
    const settings = new Gio.Settings({
      schema_id: 'org.gnome.settings-daemon.plugins.color',
    });
    settings.set_boolean('night-light-enabled', enabled);
  }

  getNightLight(): boolean {
    const settings = new Gio.Settings({
      schema_id: 'org.gnome.settings-daemon.plugins.color',
    });
    return settings.get_boolean('night-light-enabled');
  }

  setScreenTimeout(seconds: number): void {
    const settings = new Gio.Settings({
      schema_id: 'org.gnome.desktop.session',
    });
    settings.set_uint('idle-delay', seconds);
  }

  getScreenTimeout(): number {
    const settings = new Gio.Settings({
      schema_id: 'org.gnome.desktop.session',
    });
    return settings.get_uint('idle-delay');
  }

  setScreenOrientation(orientation: 'portrait' | 'landscape'): void {
    // This is hard. xrandr -o left/normal?
    // On Wayland, this is managed by Mutter.
    // 'gnome-monitor-config' tool might work if installed.
    // Or DBus to org.gnome.Mutter.DisplayConfig.
    // This is complex and risky.
    // Let's try a simple xrandr fallback for X11, and maybe warn for Wayland.
    try {
      const cmd =
        orientation === 'portrait' ? 'xrandr -o left' : 'xrandr -o normal';
      GLib.spawn_command_line_async(cmd);
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to set orientation:', e);
    }
  }

  setRefreshRate(rate: number): void {
    debugLog(`[GnomeShellAdapter] Setting refresh rate to ${rate}Hz`);
    try {
      // Use xrandr to set refresh rate
      const [success, stdout] =
        GLib.spawn_command_line_sync('xrandr --current');
      if (success && stdout) {
        const output = new TextDecoder().decode(stdout);
        debugLog(`[GnomeShellAdapter] xrandr output length: ${output.length}`);

        // Find connected display and current resolution
        const lines = output.split('\n');
        let displayName = '';
        let currentResolution = '';

        for (const line of lines) {
          if (line.includes(' connected')) {
            displayName = line.split(' ')[0];
            debugLog(`[GnomeShellAdapter] Found display: ${displayName}`);
          }
          // Find current resolution from the line with * (current mode)
          if (line.includes('*')) {
            const trimmed = line.trim();
            currentResolution = trimmed.split(' ')[0];
            debugLog(
              `[GnomeShellAdapter] Current resolution: ${currentResolution}`
            );
          }
        }

        if (displayName && currentResolution) {
          // Set refresh rate with explicit mode
          const cmd = `xrandr --output ${displayName} --mode ${currentResolution} --rate ${rate}`;
          debugLog(`[GnomeShellAdapter] Executing: ${cmd}`);
          const [res, out, err] = GLib.spawn_command_line_sync(cmd);
          if (!res) {
            console.error(
              `[GnomeShellAdapter] xrandr execution failed. Stderr: ${
                err ? new TextDecoder().decode(err) : 'none'
              }`
            );
          } else {
            debugLog(`[GnomeShellAdapter] xrandr executed successfully.`);
          }
        } else {
          console.warn(
            `[GnomeShellAdapter] Could not determine display (${displayName}) or resolution (${currentResolution})`
          );
        }
      } else {
        console.warn('[GnomeShellAdapter] xrandr command failed');
      }
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to set refresh rate:', e);
    }
  }

  getRefreshRate(): number {
    try {
      const [success, stdout] =
        GLib.spawn_command_line_sync('xrandr --current');
      if (success && stdout) {
        const output = new TextDecoder().decode(stdout);
        // Find current refresh rate (marked with *)
        // Regex: look for number followed by *
        const match = output.match(/(\d+\.\d+)\*/);
        if (match) {
          const rate = Math.round(parseFloat(match[1]));
          debugLog(`[GnomeShellAdapter] Current refresh rate: ${rate}Hz`);
          return rate;
        }
      }
      console.warn(
        '[GnomeShellAdapter] Could not detect current refresh rate, defaulting to 60'
      );
      return 60; // Default fallback
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to get refresh rate:', e);
      return 60;
    }
  }

  getAvailableRefreshRates(): number[] {
    try {
      const [success, stdout] =
        GLib.spawn_command_line_sync('xrandr --current');
      if (success && stdout) {
        const output = new TextDecoder().decode(stdout);
        const rates: number[] = [];
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.includes('*')) {
            // Extract all rates from this line
            const rateMatches = line.matchAll(/(\d+\.\d+)/g);
            for (const match of rateMatches) {
              const rate = Math.round(parseFloat(match[1]));
              if (rate > 0 && !rates.includes(rate)) {
                rates.push(rate);
              }
            }
            break;
          }
        }
        const sortedRates = rates.sort((a, b) => b - a);
        debugLog(
          `[GnomeShellAdapter] Available refresh rates: ${sortedRates.join(
            ', '
          )}`
        );
        return sortedRates;
      }
      return [60]; // Default fallback
    } catch (e) {
      console.error(
        '[GnomeShellAdapter] Failed to get available refresh rates:',
        e
      );
      return [60];
    }
  }

  setPowerSaver(enabled: boolean): void {
    try {
      const cmd = enabled
        ? 'powerprofilesctl set power-saver'
        : 'powerprofilesctl set balanced';
      GLib.spawn_command_line_async(cmd);
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to set power saver:', e);
    }
  }

  getPowerSaver(): boolean {
    try {
      const [success, stdout] = GLib.spawn_command_line_sync(
        'powerprofilesctl get'
      );
      if (success && stdout) {
        const output = new TextDecoder().decode(stdout).trim();
        return output === 'power-saver';
      }
      return false;
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to get power saver:', e);
      return false;
    }
  }

  openLink(url: string): void {
    debugLog(`[GnomeShellAdapter] Opening link: ${url}`);
    try {
      Gio.AppInfo.launch_default_for_uri(url, null);
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to open link:', e);
    }
  }

  takeScreenshot(): void {
    debugLog('[GnomeShellAdapter] Taking screenshot');
    try {
      GLib.spawn_command_line_async('gnome-screenshot');
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to take screenshot:', e);
    }
  }

  executeCommand(command: string): void {
    debugLog(`[GnomeShellAdapter] Executing command: ${command}`);
    try {
      GLib.spawn_command_line_async(command);
    } catch (e) {
      console.error(
        `[GnomeShellAdapter] Failed to execute command '${command}':`,
        e
      );
    }
  }

  openApp(appIds: string[]): void {
    try {
      appIds.forEach((appId) => {
        // Find the app info
        // appId might be 'firefox' or 'firefox.desktop'
        let id = appId;
        if (!id.endsWith('.desktop')) id += '.desktop';

        const appInfo = Gio.DesktopAppInfo.new(id);
        if (appInfo) {
          appInfo.launch([], null);
        } else {
          // Try searching all apps if exact match failed
          const apps = Gio.AppInfo.get_all();
          const found = apps.find(
            (a: any) => a.get_id() === id || a.get_id() === appId
          );
          if (found) {
            found.launch([], null);
          }
        }
      });
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to open apps:', e);
    }
  }
  setKeyboardBrightness(percentage: number): void {
    debugLog(
      `[GnomeShellAdapter] Setting keyboard brightness to: ${percentage}%`
    );
    try {
      const value = Math.max(0, Math.min(100, percentage));

      Gio.DBus.session.call(
        'org.gnome.SettingsDaemon.Power',
        '/org/gnome/SettingsDaemon/Power',
        'org.freedesktop.DBus.Properties',
        'Set',
        new GLib.Variant('(ssv)', [
          'org.gnome.SettingsDaemon.Power.Keyboard',
          'Brightness',
          new GLib.Variant('i', value),
        ]),
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
        (connection: any, res: any) => {
          try {
            connection.call_finish(res);
            debugLog(
              `[GnomeShellAdapter] Keyboard brightness set to ${value}%`
            );
          } catch (e) {
            console.error(
              '[GnomeShellAdapter] Failed to set keyboard brightness (async):',
              e
            );
          }
        }
      );
    } catch (e) {
      console.error(
        '[GnomeShellAdapter] Failed to initiate keyboard brightness set:',
        e
      );
    }
  }

  getKeyboardBrightness(): Promise<number> {
    return new Promise((resolve) => {
      try {
        Gio.DBus.session.call(
          'org.gnome.SettingsDaemon.Power',
          '/org/gnome/SettingsDaemon/Power',
          'org.freedesktop.DBus.Properties',
          'Get',
          new GLib.Variant('(ss)', [
            'org.gnome.SettingsDaemon.Power.Keyboard',
            'Brightness',
          ]),
          null,
          Gio.DBusCallFlags.NONE,
          -1,
          null,
          (connection: any, res: any) => {
            try {
              const result = connection.call_finish(res);
              // Result is a tuple containing a variant: (<50>,)
              const variant = result.get_child_value(0); // The variant inside the tuple
              const value = variant.get_variant().get_int32(); // Unpack variant 'i'
              debugLog(
                `[GnomeShellAdapter] Got keyboard brightness: ${value}%`
              );
              resolve(value);
            } catch (e) {
              console.error(
                '[GnomeShellAdapter] Failed to get keyboard brightness (async):',
                e
              );
              resolve(0); // Default to 0 on error
            }
          }
        );
      } catch (e) {
        console.error(
          '[GnomeShellAdapter] Failed to initiate keyboard brightness get:',
          e
        );
        resolve(0);
      }
    });
  }

  getWifiPowerState(): boolean {
    try {
      const client = NM.Client.new(null);
      return client ? client.wireless_enabled : false;
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to get Wifi power state:', e);
      return false;
    }
  }

  onWifiPowerStateChanged(callback: (isEnabled: boolean) => void): void {
    try {
      const client = NM.Client.new(null);
      if (client) {
        client.connect('notify::wireless-enabled', () => {
          callback(client.wireless_enabled);
        });
      }
    } catch (e) {
      console.error(
        '[GnomeShellAdapter] Failed to subscribe to Wifi power changes:',
        e
      );
    }
  }

  async getBluetoothPowerState(): Promise<boolean> {
    return this.getBluetooth();
  }

  onBluetoothPowerStateChanged(callback: (isEnabled: boolean) => void): void {
    try {
      const DBus = Gio.DBus;

      // Subscribe to PropertiesChanged on org.bluez
      Gio.DBus.system.signal_subscribe(
        'org.bluez',
        'org.freedesktop.DBus.Properties',
        'PropertiesChanged',
        null, // path (null for all adapters)
        null,
        0,
        (
          connection: any,
          sender: any,
          path: any,
          iface: any,
          signal: any,
          params: any
        ) => {
          const [interfaceName, changedProps] = params.deep_unpack();
          if (
            interfaceName === 'org.bluez.Adapter1' &&
            changedProps.Powered !== undefined
          ) {
            callback(changedProps.Powered.get_boolean());
          }
        }
      );
    } catch (e) {
      console.error(
        '[GnomeShellAdapter] Failed to subscribe to Bluetooth power:',
        e
      );
    }
  }

  getConnectedBluetoothDevices(): Promise<{ name: string; address: string }[]> {
    return new Promise((resolve) => {
      try {
        // Use DBus ObjectManager to get all objects from BlueZ
        Gio.DBus.system.call(
          'org.bluez',
          '/',
          'org.freedesktop.DBus.ObjectManager',
          'GetManagedObjects',
          null,
          null,
          Gio.DBusCallFlags.NONE,
          -1,
          null,
          (connection: any, res: any) => {
            try {
              const result = connection.call_finish(res);
              if (!result) {
                resolve([]);
                return;
              }

              // Unpack the result: (a{oa{sa{sv}}})
              const [objects] = result.deep_unpack();
              const devices: { name: string; address: string }[] = [];

              const unpackVariant = (val: any): any => {
                if (val instanceof GLib.Variant) {
                  return val.deep_unpack();
                }
                return val;
              };

              for (const objectPath in objects) {
                const interfaces = objects[objectPath];
                if ('org.bluez.Device1' in interfaces) {
                  const deviceProps = interfaces['org.bluez.Device1'];

                  // Properties in a{sv} are Variants, need to unpack
                  const connected = unpackVariant(deviceProps.Connected);

                  // Check if connected
                  if (connected === true) {
                    const alias = unpackVariant(deviceProps.Alias);
                    const name = unpackVariant(deviceProps.Name);
                    const address = unpackVariant(deviceProps.Address);

                    const finalName = alias || name || 'Unknown Device';
                    const finalAddress = address || '';

                    debugLog(
                      `[GnomeShellAdapter] Found connected device: ${finalName} (${finalAddress})`
                    );
                    devices.push({ name: finalName, address: finalAddress });
                  }
                }
              }

              debugLog(
                `[GnomeShellAdapter] Total connected devices found: ${devices.length}`
              );
              resolve(devices);
            } catch (e) {
              console.error(
                '[GnomeShellAdapter] Failed to get connected Bluetooth devices via DBus (async):',
                e
              );
              resolve([]);
            }
          }
        );
      } catch (e) {
        console.error(
          '[GnomeShellAdapter] Failed to initiate Bluetooth devices get:',
          e
        );
        resolve([]);
      }
    });
  }

  onBluetoothDeviceStateChanged(callback: () => void): void {
    try {
      // Subscribe to PropertiesChanged on org.bluez.Device1
      // When 'Connected' property changes
      Gio.DBus.system.signal_subscribe(
        'org.bluez', // Listen only to org.bluez
        'org.freedesktop.DBus.Properties',
        'PropertiesChanged',
        null,
        null,
        0,
        (
          connection: any,
          sender: any,
          path: any,
          iface: any,
          signal: any,
          params: any
        ) => {
          const [interfaceName, changedProps] = params.deep_unpack();
          debugLog(`[GnomeShellAdapter] DBus Signal: ${interfaceName}`);
          if (
            interfaceName === 'org.bluez.Device1' &&
            changedProps.Connected !== undefined
          ) {
            debugLog(
              `[GnomeShellAdapter] Bluetooth device connected state changed: ${changedProps.Connected}`
            );
            callback();
          }
        }
      );
    } catch (e) {
      console.error(
        '[GnomeShellAdapter] Failed to subscribe to Bluetooth device changes:',
        e
      );
    }
  }

  // Power & Battery

  getBatteryLevel(): number {
    try {
      const client = UPower.Client.new_full(null);
      const device = client.get_display_device();
      return device ? device.percentage : 100;
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to get battery level:', e);
      return 100;
    }
  }

  isCharging(): boolean {
    try {
      const client = UPower.Client.new_full(null);
      const device = client.get_display_device();
      // UPower.DeviceState.CHARGING = 1, FULLY_CHARGED = 4
      return device ? device.state === 1 || device.state === 4 : false;
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to check charging state:', e);
      return false;
    }
  }

  onBatteryStateChanged(
    callback: (level: number, isCharging: boolean) => void
  ): void {
    try {
      const client = UPower.Client.new_full(null);
      const device = client.get_display_device();
      if (device) {
        device.connect('notify::percentage', () => {
          callback(device.percentage, device.state === 1 || device.state === 4);
        });
        device.connect('notify::state', () => {
          callback(device.percentage, device.state === 1 || device.state === 4);
        });
      }
    } catch (e) {
      console.error(
        '[GnomeShellAdapter] Failed to subscribe to battery changes:',
        e
      );
    }
  }

  // Power Saver
  getPowerSaverState(): boolean {
    try {
      // Check power-profiles-daemon via DBus property
      // Or simpler: check if 'power-saver' profile is active

      const [success, stdout] = GLib.spawn_command_line_sync(
        'powerprofilesctl get'
      );
      if (success && stdout) {
        const output = new TextDecoder().decode(stdout).trim();
        return output === 'power-saver';
      }
      return false;
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to get power saver state:', e);
      return false;
    }
  }

  onPowerSaverStateChanged(callback: (isActive: boolean) => void): void {
    // Polling is safest for command line check, but we can try DBus signal
    // For now, let's use a polling interval since powerprofilesctl doesn't emit easy signals without DBus proxy
    // Actually, we can watch the DBus property
    try {
      Gio.DBus.system.signal_subscribe(
        'org.freedesktop.UPower.PowerProfiles',
        'org.freedesktop.DBus.Properties',
        'PropertiesChanged',
        null,
        null,
        0,
        (
          connection: any,
          sender: any,
          path: any,
          iface: any,
          signal: any,
          params: any
        ) => {
          // Re-check state when properties change
          callback(this.getPowerSaverState());
        }
      );
    } catch (e) {
      console.error(
        '[GnomeShellAdapter] Failed to subscribe to power saver changes:',
        e
      );
    }
  }

  // Dark Mode
  getDarkModeState(): boolean {
    const settings = new Gio.Settings({
      schema_id: 'org.gnome.desktop.interface',
    });
    return settings.get_string('color-scheme') === 'prefer-dark';
  }

  onDarkModeStateChanged(callback: (isDark: boolean) => void): void {
    const settings = new Gio.Settings({
      schema_id: 'org.gnome.desktop.interface',
    });
    settings.connect('changed::color-scheme', () => {
      callback(settings.get_string('color-scheme') === 'prefer-dark');
    });
  }

  // Airplane Mode
  getAirplaneModeState(): boolean {
    try {
      // Check rfkill

      const [success, stdout] = GLib.spawn_command_line_sync('rfkill list');
      if (success && stdout) {
        const output = new TextDecoder().decode(stdout);
        // If ALL wireless devices are Soft blocked: yes, then airplane mode is effectively on
        // But usually there is a master switch.
        // Let's check if we can find any "Soft blocked: no"
        // If ANY is unblocked, Airplane mode is OFF.
        // If ALL are blocked, Airplane mode is ON.
        return !output.includes('Soft blocked: no');
      }
      return false;
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to get airplane mode:', e);
      return false;
    }
  }

  onAirplaneModeStateChanged(callback: (isEnabled: boolean) => void): void {
    // rfkill events are hard to catch without udev or DBus
    // We'll use a polling fallback or DBus if possible
    // org.gnome.SettingsDaemon.Rfkill
    try {
      Gio.DBus.session.signal_subscribe(
        'org.gnome.SettingsDaemon.Rfkill',
        'org.freedesktop.DBus.Properties',
        'PropertiesChanged',
        null,
        null,
        0,
        () => {
          callback(this.getAirplaneModeState());
        }
      );
    } catch (e) {
      console.error(
        '[GnomeShellAdapter] Failed to subscribe to airplane mode:',
        e
      );
    }
  }

  // Wired Headphones
  getWiredHeadphonesState(): boolean {
    try {
      const [success, stdout] =
        GLib.spawn_command_line_sync('pactl list sinks');
      if (success && stdout) {
        const output = new TextDecoder().decode(stdout);
        // Look for "analog-output-headphones" and "availability: Available" (or just active port)
        // Or "Active Port: analog-output-headphones"
        return output.includes('Active Port: analog-output-headphones');
      }
      return false;
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to get headphones state:', e);
      return false;
    }
  }

  onWiredHeadphonesStateChanged(
    callback: (isConnected: boolean) => void
  ): void {
    // PulseAudio subscription is complex via command line (pactl subscribe)
    // We can spawn a persistent process to listen? No, that's heavy.
    // We'll use a polling interval for now as it's the most reliable "universal" way without native bindings
    // Or we can try to hook into GVC (Gnome Volume Control) if available in Shell context
    // Shell.Global.get().get_display()? No.
    // Let's use a polling timer for this specific trigger if activated.
    // But the adapter interface expects a callback registration.
    // We'll simulate it with a timeout for now.

    GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
      const newState = this.getWiredHeadphonesState();
      // We need to track old state to only emit on change, but we don't have state here easily.
      // We'll just emit and let the trigger handle dedup if needed, or better, store state here.
      // For simplicity/statelessness of adapter, we'll emit.
      // Actually, the trigger logic usually checks `isActive` so repeated emits are fine if state matches.
      callback(newState);
      return GLib.SOURCE_CONTINUE;
    });
  }

  getActiveApp(): string | null {
    // @ts-ignore
    const app = this.appSystem
      .get_running()
      .find((a: any) => a.state === Shell.AppState.RUNNING && a.is_active());
    return app ? app.get_name() : null;
  }

  onActiveAppChanged(callback: (appName: string) => void): void {
    try {
      const appSystem = Shell.AppSystem.get_default();

      // Listen for app state changes - use STARTING (1) to catch apps immediately
      // STARTING = 1, RUNNING = 2
      this.appListenerId = appSystem.connect(
        'app-state-changed',
        (sys: any, app: any) => {
          // Trigger on STARTING state (1) for immediate detection
          if (app.state === 1 || app.state === Shell.AppState.RUNNING) {
            callback(app.get_name());
          }
        }
      );
    } catch (e) {
      console.error(
        '[GnomeShellAdapter] Failed to subscribe to app changes:',
        e
      );
    }
  }

  // Clipboard
  getClipboardContent(): Promise<{
    type: 'text' | 'image' | 'other';
    content?: string;
  }> {
    return new Promise((resolve) => {
      try {
        const clipboard = St.Clipboard.get_default();

        clipboard.get_text(
          St.ClipboardType.CLIPBOARD,
          (clipboard: any, text: string) => {
            if (text) {
              resolve({ type: 'text', content: text });
            } else {
              resolve({ type: 'other' });
            }
          }
        );
      } catch (e) {
        console.error(
          '[GnomeShellAdapter] Failed to get clipboard content:',
          e
        );
        resolve({ type: 'other' });
      }
    });
  }

  setClipboardText(text: string): void {
    try {
      const clipboard = St.Clipboard.get_default();
      clipboard.set_text(St.ClipboardType.CLIPBOARD, text);
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to set clipboard text:', e);
    }
  }

  clearClipboard(): void {
    this.setClipboardText('');
  }

  private clipboardTimeoutId: number = 0;

  onClipboardChanged(callback: () => void): void {
    // St.Clipboard has no signals. We must poll.

    const clipboard = St.Clipboard.get_default();

    let lastContent: string | null = null;

    // Clear existing timeout if any
    if (this.clipboardTimeoutId) {
      GLib.source_remove(this.clipboardTimeoutId);
      this.clipboardTimeoutId = 0;
    }

    // Initialize lastContent
    clipboard.get_text(St.ClipboardType.CLIPBOARD, (cb: any, text: string) => {
      lastContent = text;
      debugLog(
        `[GnomeShellAdapter] Clipboard INIT. Content: "${text}" (Type: ${typeof text})`
      );

      // Start polling only after initialization
      this.clipboardTimeoutId = GLib.timeout_add(
        GLib.PRIORITY_DEFAULT,
        1000,
        () => {
          clipboard.get_text(
            St.ClipboardType.CLIPBOARD,
            (cb: any, newText: string) => {
              // If content hasn't changed, skip
              if (newText === lastContent) {
                return;
              }

              // Ignore transitions TO empty/null (happens on wake/unlock)
              // Only care about transitions TO actual content
              if (newText === null || newText === undefined || newText === '') {
                debugLog(
                  `[GnomeShellAdapter] Clipboard became empty/null. Ignoring (likely system event).`
                );
                // Keep lastContent - don't update it
                return;
              }

              // If we get here, clipboard changed to non-empty content
              // But skip if lastContent was also empty (initial setup)
              if (
                lastContent === null ||
                lastContent === undefined ||
                lastContent === ''
              ) {
                debugLog(
                  `[GnomeShellAdapter] Clipboard initial content detected: "${newText}". No trigger.`
                );
                lastContent = newText;
                return;
              }

              // Real clipboard change detected!
              debugLog(
                `[GnomeShellAdapter] Clipboard CHANGE DETECTED! Old: "${lastContent}" -> New: "${newText}"`
              );

              lastContent = newText;
              try {
                debugLog('[GnomeShellAdapter] Calling clipboard callback...');
                callback();
              } catch (e) {
                console.error(
                  '[GnomeShellAdapter] Error in clipboard callback:',
                  e
                );
              }
            }
          );
          return GLib.SOURCE_CONTINUE;
        }
      );
    });
  }

  destroy() {
    if (this.appListenerId) {
      const appSystem = Shell.AppSystem.get_default();
      appSystem.disconnect(this.appListenerId);
      this.appListenerId = 0;
    }
    if (this.clipboardTimeoutId) {
      GLib.source_remove(this.clipboardTimeoutId);
      this.clipboardTimeoutId = 0;
      debugLog('[GnomeShellAdapter] Clipboard polling stopped.');
    }
  }
}
