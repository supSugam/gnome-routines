import { SystemAdapter } from './adapter.js';

// @ts-ignore
import Shell from "gi://Shell";
// @ts-ignore
import * as Main from "resource:///org/gnome/shell/ui/main.js";
// @ts-ignore
import * as MessageTray from "resource:///org/gnome/shell/ui/messageTray.js";
// @ts-ignore
import Gio from "gi://Gio";

declare const global: any;

export class GnomeShellAdapter implements SystemAdapter {
  private appSystem: any;
  private appListenerId: number = 0;

  constructor() {
    this.appSystem = Shell.AppSystem.get_default();
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
    console.log(`[GnomeShellAdapter] Setting DND to: ${enabled}`);
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
    console.log(`[GnomeShellAdapter] Setting brightness to: ${percentage}%`);
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

  setVolume(percentage: number): void {
    console.log(`[GnomeShellAdapter] Setting volume to: ${percentage}%`);
    try {
      // @ts-ignore
      const GLib = imports.gi.GLib;
      const command = `pactl set-sink-volume @DEFAULT_SINK@ ${percentage}%`;
      GLib.spawn_command_line_async(command);
      console.log(
        `[GnomeShellAdapter] Volume set command executed: ${command}`
      );
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to set volume:', e);
    }
  }

  getVolume(): number {
    try {
      // @ts-ignore
      const GLib = imports.gi.GLib;
      const [res, out, err, status] = GLib.spawn_command_line_sync(
        'pactl get-sink-volume @DEFAULT_SINK@'
      );

      if (status === 0) {
        const output = new TextDecoder().decode(out);
        // Parse output like: "Volume: front-left: 65536 / 100% / 0.00 dB,   front-right: 65536 / 100% / 0.00 dB"
        const match = output.match(/(\d+)%/);
        if (match) {
          return parseInt(match[1], 10);
        }
      }
      return 50;
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to get volume:', e);
      return 50;
    }
  }

  setBluetoothVolume(percentage: number): boolean {
    try {
      // @ts-ignore
      const GLib = imports.gi.GLib;
      // List sinks to find Bluetooth ones
      const [res, out, err, status] = GLib.spawn_command_line_sync(
        'pactl list short sinks'
      );

      if (status !== 0) {
        console.error('[GnomeShellAdapter] Failed to list sinks');
        return false;
      }

      const output = new TextDecoder().decode(out);
      const lines = output.split('\n');
      let found = false;

      for (const line of lines) {
        // Look for bluez output
        // Example: 2	bluez_output.XX_XX_XX_XX_XX_XX.a2dp-sink	module-bluez5-device.c	s16le 2ch 44100Hz	SUSPENDED
        if (line.includes('bluez_output')) {
          const parts = line.split('\t');
          const sinkName = parts[1];
          console.log(`[GnomeShellAdapter] Found Bluetooth sink: ${sinkName}`);

          const command = `pactl set-sink-volume ${sinkName} ${percentage}%`;
          GLib.spawn_command_line_async(command);
          console.log(`[GnomeShellAdapter] Executed: ${command}`);
          found = true;
        }
      }

      return found;
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to set Bluetooth volume:', e);
      return false;
    }
  }

  setSinkVolume(sinkName: string, percentage: number): void {
    // Legacy support if needed
    try {
      // @ts-ignore
      const GLib = imports.gi.GLib;
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
    console.log(`[GnomeShellAdapter] Setting wallpaper to: ${uri}`);
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
    console.log(`[GnomeShellAdapter] Current wallpaper: ${uri}`);
    return uri;
  }

  setBluetooth(enabled: boolean): void {
    console.log(`[GnomeShellAdapter] Setting Bluetooth to: ${enabled}`);
    try {
      // @ts-ignore
      const GLib = imports.gi.GLib;

      // Use bluetoothctl (BlueZ control) - most reliable method
      const command = enabled
        ? 'bluetoothctl power on'
        : 'bluetoothctl power off';
      const [success, stdout, stderr] = GLib.spawn_command_line_sync(command);

      if (success) {
        console.log(
          `[GnomeShellAdapter] Bluetooth ${
            enabled ? 'enabled' : 'disabled'
          } via bluetoothctl`
        );
      } else {
        const error = stderr
          ? new TextDecoder().decode(stderr)
          : 'unknown error';
        console.warn(
          `[GnomeShellAdapter] bluetoothctl failed, trying rfkill. Error: ${error}`
        );
        // Fallback to rfkill
        const rfkillCommand = enabled
          ? 'rfkill unblock bluetooth'
          : 'rfkill block bluetooth';
        GLib.spawn_command_line_async(rfkillCommand);
      }
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to set Bluetooth:', e);
      // Try rfkill as last resort
      try {
        // @ts-ignore
        const GLib = imports.gi.GLib;
        const rfkillCommand = enabled
          ? 'rfkill unblock bluetooth'
          : 'rfkill block bluetooth';
        GLib.spawn_command_line_async(rfkillCommand);
      } catch (err) {
        console.error('[GnomeShellAdapter] rfkill fallback failed:', err);
      }
    }
  }

  getBluetooth(): boolean {
    try {
      // @ts-ignore
      const GLib = imports.gi.GLib;

      // Check Bluetooth status via bluetoothctl
      const command = 'bluetoothctl show';
      const [success, stdout] = GLib.spawn_command_line_sync(command);

      if (success && stdout) {
        const output = new TextDecoder().decode(stdout);
        // Look for "Powered: yes" or "Powered: no"
        const match = output.match(/Powered:\s*(yes|no)/i);
        if (match) {
          const isOn = match[1].toLowerCase() === 'yes';
          console.log(
            `[GnomeShellAdapter] Bluetooth state: ${isOn ? 'on' : 'off'}`
          );
          return isOn;
        }
      }
      return false;
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to get Bluetooth state:', e);
      return false;
    }
  }

  setWifi(enabled: boolean): void {
    console.log(`[GnomeShellAdapter] Setting Wifi to ${enabled}`);
    try {
      // @ts-ignore
      const GLib = imports.gi.GLib;
      const cmd = enabled ? 'nmcli radio wifi on' : 'nmcli radio wifi off';
      GLib.spawn_command_line_async(cmd);
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to set Wifi:', e);
    }
  }

  async connectToWifi(ssid: string): Promise<boolean> {
    console.log(`[GnomeShellAdapter] Connecting to Wifi ${ssid}`);
    try {
      // @ts-ignore
      const GLib = imports.gi.GLib;
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
      // @ts-ignore
      const NM = imports.gi.NM;
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
      // @ts-ignore
      const NM = imports.gi.NM;
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
      // @ts-ignore
      const NM = imports.gi.NM;
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
      // @ts-ignore
      const NM = imports.gi.NM;
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

  connectBluetoothDevice(id: string): void {
    try {
      // @ts-ignore
      const GLib = imports.gi.GLib;
      // bluetoothctl connect <MAC>
      // We stored 'Name' in triggers, but for connection we ideally need MAC.
      // If we only have Name, we might need to resolve it.
      // But wait, the trigger UI stored the Name (alias).
      // We should probably update the trigger/action UI to store MAC address as ID and Name as label.
      // For now, let's try to connect by Name (bluetoothctl might not support it directly without lookup).
      // Let's do a lookup first if it looks like a name.
      let mac = id;
      if (!id.includes(':')) {
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

      GLib.spawn_command_line_async(`bluetoothctl connect ${mac}`);
    } catch (e) {
      console.error(
        '[GnomeShellAdapter] Failed to connect bluetooth device:',
        e
      );
    }
  }

  disconnectBluetoothDevice(id: string): void {
    try {
      // @ts-ignore
      const GLib = imports.gi.GLib;
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
      // @ts-ignore
      const GLib = imports.gi.GLib;
      // rfkill block all / unblock all
      const cmd = enabled ? 'rfkill block all' : 'rfkill unblock all';
      GLib.spawn_command_line_async(cmd);
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to set airplane mode:', e);
    }
  }

  setDarkMode(enabled: boolean): void {
    // @ts-ignore
    const Gio = imports.gi.Gio;
    const settings = new Gio.Settings({
      schema_id: 'org.gnome.desktop.interface',
    });
    settings.set_string('color-scheme', enabled ? 'prefer-dark' : 'default');
  }

  getDarkMode(): boolean {
    // @ts-ignore
    const Gio = imports.gi.Gio;
    const settings = new Gio.Settings({
      schema_id: 'org.gnome.desktop.interface',
    });
    return settings.get_string('color-scheme') === 'prefer-dark';
  }

  setNightLight(enabled: boolean): void {
    // @ts-ignore
    const Gio = imports.gi.Gio;
    const settings = new Gio.Settings({
      schema_id: 'org.gnome.settings-daemon.plugins.color',
    });
    settings.set_boolean('night-light-enabled', enabled);
  }

  getNightLight(): boolean {
    // @ts-ignore
    const Gio = imports.gi.Gio;
    const settings = new Gio.Settings({
      schema_id: 'org.gnome.settings-daemon.plugins.color',
    });
    return settings.get_boolean('night-light-enabled');
  }

  setScreenTimeout(seconds: number): void {
    // @ts-ignore
    const Gio = imports.gi.Gio;
    const settings = new Gio.Settings({
      schema_id: 'org.gnome.desktop.session',
    });
    settings.set_uint('idle-delay', seconds);
  }

  getScreenTimeout(): number {
    // @ts-ignore
    const Gio = imports.gi.Gio;
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
      // @ts-ignore
      const GLib = imports.gi.GLib;
      const cmd =
        orientation === 'portrait' ? 'xrandr -o left' : 'xrandr -o normal';
      GLib.spawn_command_line_async(cmd);
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to set orientation:', e);
    }
  }

  setRefreshRate(rate: number): void {
    console.log(`[GnomeShellAdapter] Setting refresh rate to ${rate}Hz`);
    try {
      // @ts-ignore
      const GLib = imports.gi.GLib;

      // Use xrandr to set refresh rate
      const [success, stdout] =
        GLib.spawn_command_line_sync('xrandr --current');
      if (success && stdout) {
        const output = new TextDecoder().decode(stdout);
        console.log(
          `[GnomeShellAdapter] xrandr output length: ${output.length}`
        );

        // Find connected display and current resolution
        const lines = output.split('\n');
        let displayName = '';
        let currentResolution = '';

        for (const line of lines) {
          if (line.includes(' connected')) {
            displayName = line.split(' ')[0];
            console.log(`[GnomeShellAdapter] Found display: ${displayName}`);
          }
          // Find current resolution from the line with * (current mode)
          if (line.includes('*')) {
            const trimmed = line.trim();
            currentResolution = trimmed.split(' ')[0];
            console.log(
              `[GnomeShellAdapter] Current resolution: ${currentResolution}`
            );
          }
        }

        if (displayName && currentResolution) {
          // Set refresh rate with explicit mode
          const cmd = `xrandr --output ${displayName} --mode ${currentResolution} --rate ${rate}`;
          console.log(`[GnomeShellAdapter] Executing: ${cmd}`);
          const [res, out, err] = GLib.spawn_command_line_sync(cmd);
          if (!res) {
            console.error(
              `[GnomeShellAdapter] xrandr execution failed. Stderr: ${
                err ? new TextDecoder().decode(err) : 'none'
              }`
            );
          } else {
            console.log(`[GnomeShellAdapter] xrandr executed successfully.`);
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
      // @ts-ignore
      const GLib = imports.gi.GLib;
      const [success, stdout] =
        GLib.spawn_command_line_sync('xrandr --current');
      if (success && stdout) {
        const output = new TextDecoder().decode(stdout);
        // Find current refresh rate (marked with *)
        // Regex: look for number followed by *
        const match = output.match(/(\d+\.\d+)\*/);
        if (match) {
          const rate = Math.round(parseFloat(match[1]));
          console.log(`[GnomeShellAdapter] Current refresh rate: ${rate}Hz`);
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
      // @ts-ignore
      const GLib = imports.gi.GLib;
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
        console.log(
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
      // @ts-ignore
      const GLib = imports.gi.GLib;
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
      // @ts-ignore
      const GLib = imports.gi.GLib;
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
    try {
      // @ts-ignore
      const GLib = imports.gi.GLib;
      // xdg-open
      GLib.spawn_command_line_async(`xdg-open ${url}`);
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to open link:', e);
    }
  }

  takeScreenshot(): void {
    try {
      // @ts-ignore
      const GLib = imports.gi.GLib;

      // Ensure Pictures directory exists
      const picturesDir = `${GLib.get_home_dir()}/Pictures`;
      const filename = `${picturesDir}/Screenshot_${new Date().getTime()}.png`;

      // Use ImageMagick's import command (simple and reliable)
      // -window root captures the entire screen
      const cmd = `import -window root "${filename}"`;
      GLib.spawn_command_line_async(cmd);

      console.log(`[GnomeShellAdapter] Taking screenshot: ${filename}`);
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to take screenshot:', e);
    }
  }

  openApp(appIds: string[]): void {
    try {
      // @ts-ignore
      const Gio = imports.gi.Gio;

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
  getWifiPowerState(): boolean {
    try {
      // @ts-ignore
      const NM = imports.gi.NM;
      const client = NM.Client.new(null);
      return client ? client.wireless_enabled : false;
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to get Wifi power state:', e);
      return false;
    }
  }

  onWifiPowerStateChanged(callback: (isEnabled: boolean) => void): void {
    try {
      // @ts-ignore
      const NM = imports.gi.NM;
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

  // Bluetooth Tracking
  getBluetoothPowerState(): boolean {
    // We can use bluetoothctl show or DBus
    // Using DBus is faster for state checks
    try {
      // @ts-ignore
      const Gio = imports.gi.Gio;
      const proxy = new Gio.DBusProxy({
        g_connection: Gio.DBus.system,
        g_name: 'org.bluez',
        g_object_path: '/org/bluez/hci0',
        g_interface_name: 'org.bluez.Adapter1',
      });
      // We need to initialize it synchronously or just read property if cached
      // But simpler to just use bluetoothctl for now as we did for actions,
      // OR use the cached property from a persistent proxy if we had one.
      // Let's stick to bluetoothctl for reliability as requested by user previously,
      // unless it's too slow.
      // Actually, for triggers, we need to be fast.
      // Let's try DBus property read.
      const result = proxy.get_cached_property('Powered');
      if (result) {
        return result.get_boolean();
      }
      // Fallback to bluetoothctl if DBus fails or not cached
      // @ts-ignore
      const GLib = imports.gi.GLib;
      const [success, stdout] =
        GLib.spawn_command_line_sync('bluetoothctl show');
      if (success && stdout) {
        const output = new TextDecoder().decode(stdout);
        return output.includes('Powered: yes');
      }
      return false;
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to get Bluetooth power:', e);
      return false;
    }
  }

  onBluetoothPowerStateChanged(callback: (isEnabled: boolean) => void): void {
    try {
      // @ts-ignore
      const Gio = imports.gi.Gio;
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

  getConnectedBluetoothDevices(): { name: string; address: string }[] {
    try {
      // @ts-ignore
      const Gio = imports.gi.Gio;
      // @ts-ignore
      const GLib = imports.gi.GLib;

      // Use DBus ObjectManager to get all objects from BlueZ
      const result = Gio.DBus.system.call_sync(
        'org.bluez',
        '/',
        'org.freedesktop.DBus.ObjectManager',
        'GetManagedObjects',
        null,
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null
      );

      if (!result) return [];

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

            console.log(
              `[GnomeShellAdapter] Found connected device: ${finalName} (${finalAddress})`
            );
            devices.push({ name: finalName, address: finalAddress });
          }
        }
      }

      console.log(
        `[GnomeShellAdapter] Total connected devices found: ${devices.length}`
      );
      return devices;
    } catch (e) {
      console.error(
        '[GnomeShellAdapter] Failed to get connected Bluetooth devices via DBus:',
        e
      );
      return [];
    }
  }

  onBluetoothDeviceStateChanged(callback: () => void): void {
    try {
      // @ts-ignore
      const Gio = imports.gi.Gio;

      // Subscribe to PropertiesChanged on org.bluez.Device1
      // When 'Connected' property changes
      Gio.DBus.system.signal_subscribe(
        null, // Listen to all senders (was 'org.bluez')
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
          console.log(
            `[GnomeShellAdapter] DBus Signal: ${interfaceName} ${JSON.stringify(
              changedProps
            )}`
          );
          if (
            interfaceName === 'org.bluez.Device1' &&
            changedProps.Connected !== undefined
          ) {
            console.log(
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
      // @ts-ignore
      const UPower = imports.gi.UPowerGlib;
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
      // @ts-ignore
      const UPower = imports.gi.UPowerGlib;
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
      // @ts-ignore
      const UPower = imports.gi.UPowerGlib;
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
      // @ts-ignore
      const GLib = imports.gi.GLib;
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
      // @ts-ignore
      const Gio = imports.gi.Gio;
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
      // @ts-ignore
      const GLib = imports.gi.GLib;
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
      // @ts-ignore
      const Gio = imports.gi.Gio;
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
      // @ts-ignore
      const GLib = imports.gi.GLib;
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
    // @ts-ignore
    const GLib = imports.gi.GLib;
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
      // @ts-ignore
      const Shell = imports.gi.Shell;
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

  destroy() {
    if (this.appListenerId) {
      // @ts-ignore
      const Shell = imports.gi.Shell;
      const appSystem = Shell.AppSystem.get_default();
      appSystem.disconnect(this.appListenerId);
      this.appListenerId = 0;
    }
  }
}
