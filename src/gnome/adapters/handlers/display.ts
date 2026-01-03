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
    return uri;
  }

  onWallpaperChanged(callback: (newUri: string) => void): () => void {
    if (!this._wallpaperSettings) {
      this._wallpaperSettings = new Gio.Settings({
        schema_id: 'org.gnome.desktop.background',
      });
    }

    const signalId = this._wallpaperSettings.connect(
      'changed',
      (settings: any, key: string) => {
        if (key === 'picture-uri' || key === 'picture-uri-dark') {
          const newUri = this._wallpaperSettings.get_string('picture-uri');
          callback(newUri);
        }
      }
    );

    const homeDir = GLib.get_home_dir();
    const backgroundPath = `${homeDir}/.config/background`;
    const backgroundFile = Gio.File.new_for_path(backgroundPath);
    let fileMonitor: any = null;
    try {
      fileMonitor = backgroundFile.monitor_file(
        Gio.FileMonitorFlags.NONE,
        null
      );
      fileMonitor.connect(
        'changed',
        (monitor: any, file: any, otherFile: any, eventType: any) => {
          if (
            eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT ||
            eventType === Gio.FileMonitorEvent.CREATED
          ) {
            callback(`file://${backgroundPath}`);
          }
        }
      );
    } catch (e) {
      debugLog('[DisplayAdapter] Failed to set up file monitor:', e);
    }

    return () => {
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
      const settings = new Gio.Settings({
        schema_id: 'org.gnome.desktop.interface',
      });

      const signalId = settings.connect('changed::color-scheme', () => {
        const isDark = settings.get_string('color-scheme') === 'prefer-dark';
        callback(isDark);
      });

      return () => {
        try {
          settings.disconnect(signalId);
        } catch (e) {}
      };
    } catch (e) {
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

  // Helper to call Mutter DisplayConfig
  private _callDisplayConfig(
    method: string,
    args: GLib.Variant
  ): Promise<GLib.Variant> {
    return new Promise((resolve, reject) => {
      Gio.DBus.session.call(
        'org.gnome.Mutter.DisplayConfig',
        '/org/gnome/Mutter/DisplayConfig',
        'org.gnome.Mutter.DisplayConfig',
        method,
        args,
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
        (conn: any, res: any) => {
          try {
            const result = conn.call_finish(res);
            resolve(result);
          } catch (e) {
            reject(e);
          }
        }
      );
    });
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
    let transform = 0; // normal
    switch (orientation) {
      case 'normal':
      case 'landscape':
        transform = 0;
        break;
      case 'right':
        transform = 1;
        break; // 90 deg
      case 'upside-down':
        transform = 2;
        break; // 180 deg
      case 'left':
      case 'portrait':
        transform = 3;
        break; // 270 deg
    }

    try {
      // Get current state
      const state = await this._callDisplayConfig('GetCurrentState', null);
      const [serial, monitors, logicalMonitors] = state.deep_unpack();

      // 1. Find primary logical monitor
      let primaryMonitorIdx = -1;

      // logicalMonitors structure: a(iiidub a(ssss) a{sv})
      // x, y, scale, transform, primary, monitors, properties
      for (let i = 0; i < logicalMonitors.length; i++) {
        const isPrimary = logicalMonitors[i][4];
        if (isPrimary) {
          primaryMonitorIdx = i;
          break;
        }
      }

      if (primaryMonitorIdx === -1 && logicalMonitors.length > 0) {
        primaryMonitorIdx = 0; // Fallback to first
      }

      if (primaryMonitorIdx === -1) {
        debugLog('[DisplayAdapter] No logical monitors found');
        return;
      }

      // 2. Update transform
      logicalMonitors[primaryMonitorIdx][3] = transform;

      // 3. Apply config
      // ApplyMonitorsConfig(serial, method, logical_monitors, properties)
      // method: 1 = verify, 2 = temporary (persistent)
      // We probably want 2 (persistent) or 1?
      // 1 is "Temporary configuration" (resets on reboot), 2 is persistent.

      await this._callDisplayConfig(
        'ApplyMonitorsConfig',
        new GLib.Variant('(uu a(iiiduba(ssss)a{sv}) a{sv})', [
          serial,
          2, // Persistent? Or 1 (Temporary)? Let's use 1 to be safe against locking out user
          logicalMonitors,
          {},
        ])
      );
      debugLog('[DisplayAdapter] Orientation applied via Mutter DBus');
    } catch (e) {
      debugLog('[DisplayAdapter] Failed to set orientation via DBus:', e);
    }
  }

  async setRefreshRate(rate: number): Promise<void> {
    debugLog(
      `[DisplayAdapter] Setting refresh rate to ${rate}Hz stub - removing xrandr`
    );
    // Removing xrandr support as requested.
    // Implementing refresh rate via Mutter DBus is extremely complex requiring mode switching logic.
    // For now we log that it's removed.
  }

  getRefreshRate(): Promise<number> {
    // Stub - without xrandr, difficult to get simply.
    // Could get from GetCurrentState logic if needed.
    return Promise.resolve(60);
  }

  getAvailableRefreshRates(): Promise<number[]> {
    return Promise.resolve([60]);
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
          } catch (e) {}
        }
      );
    } catch (e) {}
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
              resolve(value);
            } catch (e) {
              resolve(0);
            }
          }
        );
      } catch (e) {
        resolve(0);
      }
    });
  }
}
