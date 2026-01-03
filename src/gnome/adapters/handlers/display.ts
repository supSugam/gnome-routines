// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import GLib from 'gi://GLib';
import debugLog from '../../../utils/log.js';

export class DisplayAdapter {
  setBrightness(percentage: number): void {
    debugLog(`[DisplayAdapter] Setting brightness to: ${percentage}%`);
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

      proxy.Brightness = Math.max(0, Math.min(100, percentage));
    } catch (e) {
      debugLog('[DisplayAdapter] Failed to set brightness:', e);
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
      debugLog('[DisplayAdapter] Failed to get brightness:', e);
      return 100;
    }
  }

  setWallpaper(uri: string): void {
    debugLog(`[DisplayAdapter] Setting wallpaper to: ${uri}`);
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
    debugLog(`[DisplayAdapter] Current wallpaper: ${uri}`);
    return uri;
  }

  onWallpaperChanged(callback: (newUri: string) => void): () => void {
    // Store settings as instance property to prevent GC
    if (!this._wallpaperSettings) {
      this._wallpaperSettings = new Gio.Settings({
        schema_id: 'org.gnome.desktop.background',
      });
    }

    debugLog('[DisplayAdapter] Setting up wallpaper change listener');

    // Method 1: Listen to GSettings 'changed' signal
    const signalId = this._wallpaperSettings.connect(
      'changed',
      (settings: any, key: string) => {
        debugLog(`[DisplayAdapter] Background setting changed: ${key}`);
        if (key === 'picture-uri' || key === 'picture-uri-dark') {
          const newUri = this._wallpaperSettings.get_string('picture-uri');
          debugLog(`[DisplayAdapter] Wallpaper changed (GSettings): ${newUri}`);
          callback(newUri);
        }
      }
    );

    // Method 2: Monitor ~/.config/background file for changes (Files app updates this directly)
    const homeDir = GLib.get_home_dir();
    const backgroundPath = `${homeDir}/.config/background`;
    const backgroundFile = Gio.File.new_for_path(backgroundPath);
    let fileMonitor: any = null;
    try {
      fileMonitor = backgroundFile.monitor_file(
        Gio.FileMonitorFlags.NONE,
        null
      );
      debugLog(`[DisplayAdapter] Set up file monitor for ${backgroundPath}`);
      fileMonitor.connect(
        'changed',
        (monitor: any, file: any, otherFile: any, eventType: any) => {
          // CHANGES_DONE_HINT means the file write is complete
          if (
            eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT ||
            eventType === Gio.FileMonitorEvent.CREATED
          ) {
            debugLog(
              `[DisplayAdapter] Background file changed (event: ${eventType})`
            );
            callback(`file://${backgroundPath}`);
          }
        }
      );
    } catch (e) {
      debugLog('[DisplayAdapter] Failed to set up file monitor:', e);
    }

    return () => {
      debugLog('[DisplayAdapter] Removing wallpaper change listener');
      if (this._wallpaperSettings) {
        this._wallpaperSettings.disconnect(signalId);
      }

      if (fileMonitor) {
        fileMonitor.cancel();
      }
    };
  }

  private _wallpaperSettings: any = null;

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

  onDarkModeChanged(callback: (isDark: boolean) => void): () => void {
    try {
      debugLog('[DisplayAdapter] Subscribing to dark mode changes');
      const settings = new Gio.Settings({
        schema_id: 'org.gnome.desktop.interface',
      });

      const signalId = settings.connect('changed::color-scheme', () => {
        const isDark = settings.get_string('color-scheme') === 'prefer-dark';
        debugLog(`[DisplayAdapter] Dark mode changed to: ${isDark}`);
        callback(isDark);
      });

      return () => {
        try {
          settings.disconnect(signalId);
        } catch (e) {
          debugLog('[DisplayAdapter] Error unsubscribing dark mode:', e);
        }
      };
    } catch (e) {
      debugLog('[DisplayAdapter] Failed to subscribe to dark mode changes:', e);
      return () => {};
    }
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

  async setScreenOrientation(
    orientation:
      | 'portrait'
      | 'landscape'
      | 'normal'
      | 'left'
      | 'right'
      | 'upside-down'
  ): Promise<void> {
    debugLog(`[DisplayAdapter] Setting orientation to: ${orientation}`);

    // Map to xrandr rotation values
    let rotation = 'normal';
    switch (orientation) {
      case 'normal':
      case 'landscape':
        rotation = 'normal';
        break;
      case 'right':
        rotation = 'right';
        break;
      case 'left':
      case 'portrait':
        rotation = 'left';
        break;
      case 'upside-down':
        rotation = 'inverted';
        break;
      default:
        rotation = 'normal';
    }

    return new Promise((resolve) => {
      try {
        // Check session type
        const sessionType = GLib.getenv('XDG_SESSION_TYPE') || 'x11';
        // Simple check: if not wayland, assume x11/xorg
        if (sessionType === 'wayland') {
          debugLog(
            '[DisplayAdapter] Screen orientation via xrandr is NOT supported on Wayland. Disabled to prevent freezes.'
          );
          resolve();
          return;
        }

        // Get connected display
        const proc = new Gio.Subprocess({
          argv: ['xrandr', '--current'],
          flags: Gio.SubprocessFlags.STDOUT_PIPE,
        });
        proc.init(null);

        proc.communicate_utf8_async(null, null, (proc: any, res: any) => {
          try {
            const [ok, stdout] = proc.communicate_utf8_finish(res);
            if (ok && stdout) {
              // stdout is already a string when using communicate_utf8_finish
              const output = stdout;
              const lines = output.split('\n');
              let primaryDisplay = '';
              let firstConnected = '';

              // Parse xrandr output to find connected monitors
              for (const line of lines) {
                if (line.includes(' connected')) {
                  const parts = line.split(' ');
                  const name = parts[0];
                  if (!firstConnected) firstConnected = name;
                  if (line.includes(' primary')) {
                    primaryDisplay = name;
                    break; // Found primary, stop
                  }
                }
              }

              const targetDisplay = primaryDisplay || firstConnected;

              if (targetDisplay) {
                const cmd = `xrandr --output ${targetDisplay} --rotate ${rotation}`;
                debugLog(`[DisplayAdapter] Executing: ${cmd}`);
                GLib.spawn_command_line_async(cmd);
              } else {
                debugLog(
                  '[DisplayAdapter] No connected display found to rotate.'
                );
              }
            } else {
              debugLog(
                '[DisplayAdapter] xrandr returned empty output or failed.'
              );
            }
          } catch (e: any) {
            debugLog(
              '[DisplayAdapter] Failed to parse xrandr output:',
              e.message || e
            );
          }

          resolve();
        });
      } catch (e: any) {
        debugLog('[DisplayAdapter] Failed to execute xrandr:', e.message || e);
        resolve();
      }
    });
  }

  async setRefreshRate(rate: number): Promise<void> {
    debugLog(`[DisplayAdapter] Setting refresh rate to ${rate}Hz`);
    return new Promise((resolve) => {
      try {
        // First get current xrandr output to find display name
        const proc = new Gio.Subprocess({
          argv: ['xrandr', '--current'],
          flags: Gio.SubprocessFlags.STDOUT_PIPE,
        });
        proc.init(null);
        proc.communicate_utf8_async(null, null, (proc: any, res: any) => {
          try {
            const [ok, stdout] = proc.communicate_utf8_finish(res);
            if (ok && stdout) {
              const output = stdout;
              const lines = output.split('\n');
              let displayName = '';
              let currentResolution = '';

              for (const line of lines) {
                if (line.includes(' connected')) {
                  displayName = line.split(' ')[0];
                }

                if (line.includes('*')) {
                  const match = line.match(/^\s*(\d+x\d+)/);
                  if (match) {
                    currentResolution = match[1];
                  }
                }
              }

              if (displayName && currentResolution) {
                const cmd = `xrandr --output ${displayName} --mode ${currentResolution} --rate ${rate}`;
                debugLog(`[DisplayAdapter] Executing: ${cmd}`);
                GLib.spawn_command_line_async(cmd);
              } else {
                debugLog(
                  `[DisplayAdapter] Could not determine display (${displayName}) or resolution (${currentResolution})`
                );
              }
            }
          } catch (e) {
            debugLog('[DisplayAdapter] Failed to set refresh rate phase 1:', e);
          }

          resolve();
        });
      } catch (e) {
        debugLog('[DisplayAdapter] Failed to set refresh rate:', e);
        resolve();
      }
    });
  }

  getRefreshRate(): Promise<number> {
    return new Promise((resolve) => {
      try {
        const proc = new Gio.Subprocess({
          argv: ['xrandr', '--current'],
          flags: Gio.SubprocessFlags.STDOUT_PIPE,
        });
        proc.init(null);
        proc.communicate_utf8_async(null, null, (proc: any, res: any) => {
          try {
            const [ok, stdout] = proc.communicate_utf8_finish(res);
            if (ok && stdout) {
              // Regex: look for number followed by *
              const match = stdout.match(/(\d+\.\d+)\*/);
              if (match) {
                const rate = Math.round(parseFloat(match[1]));
                debugLog(`[DisplayAdapter] Current refresh rate: ${rate}Hz`);
                resolve(rate);
                return;
              }
            }

            debugLog(
              '[DisplayAdapter] Could not detect current refresh rate, defaulting to 60'
            );
            resolve(60);
          } catch (e) {
            debugLog('[DisplayAdapter] Failed to get refresh rate async:', e);
            resolve(60);
          }
        });
      } catch (e) {
        debugLog('[DisplayAdapter] Failed to initiate get refresh rate:', e);
        resolve(60);
      }
    });
  }

  getAvailableRefreshRates(): Promise<number[]> {
    return new Promise((resolve) => {
      try {
        const proc = new Gio.Subprocess({
          argv: ['xrandr', '--current'],
          flags: Gio.SubprocessFlags.STDOUT_PIPE,
        });
        proc.init(null);
        proc.communicate_utf8_async(null, null, (proc: any, res: any) => {
          try {
            const [ok, stdout] = proc.communicate_utf8_finish(res);
            if (ok && stdout) {
              const rates: number[] = [];
              const lines = stdout.split('\n');
              for (const line of lines) {
                if (line.includes('*')) {
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
              resolve(sortedRates);
            } else {
              resolve([60]);
            }
          } catch (e) {
            debugLog(
              '[DisplayAdapter] Failed to get available rates async:',
              e
            );
            resolve([60]);
          }
        });
      } catch (e) {
        debugLog('[DisplayAdapter] Failed to initiate get available rates:', e);
        resolve([60]);
      }
    });
  }

  setKeyboardBrightness(percentage: number): void {
    debugLog(`[DisplayAdapter] Setting keyboard brightness to: ${percentage}%`);
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
            debugLog(`[DisplayAdapter] Keyboard brightness set to ${value}%`);
          } catch (e) {
            debugLog(
              '[DisplayAdapter] Failed to set keyboard brightness (async):',
              e
            );
          }
        }
      );
    } catch (e) {
      debugLog(
        '[DisplayAdapter] Failed to initiate keyboard brightness set:',
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
              const variant = result.get_child_value(0);
              const value = variant.get_variant().get_int32();
              debugLog(`[DisplayAdapter] Got keyboard brightness: ${value}%`);
              resolve(value);
            } catch (e) {
              debugLog(
                '[DisplayAdapter] Failed to get keyboard brightness (async):',
                e
              );
              resolve(0);
            }
          }
        );
      } catch (e) {
        debugLog(
          '[DisplayAdapter] Failed to initiate keyboard brightness get:',
          e
        );
        resolve(0);
      }
    });
  }
}
