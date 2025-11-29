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

      // Use pactl (PulseAudio/PipeWire control) - works universally
      const command = `pactl set-sink-volume @DEFAULT_SINK@ ${percentage}%`;
      const [success, stdout, stderr] = GLib.spawn_command_line_sync(command);

      if (success) {
        console.log(
          `[GnomeShellAdapter] Volume set to ${percentage}% via pactl`
        );
      } else {
        const error = stderr
          ? new TextDecoder().decode(stderr)
          : 'unknown error';
        console.error(`[GnomeShellAdapter] pactl failed:`, error);
      }
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to set volume:', e);
    }
  }

  getVolume(): number {
    try {
      // @ts-ignore
      const GLib = imports.gi.GLib;

      // Get current volume via pactl
      const command = 'pactl get-sink-volume @DEFAULT_SINK@';
      const [success, stdout] = GLib.spawn_command_line_sync(command);

      if (success && stdout) {
        const output = new TextDecoder().decode(stdout);
        // Output format: "Volume: front-left: 32768 /  50% / -18.06 dB,   front-right: 32768 /  50% / -18.06 dB"
        const match = output.match(/(\d+)%/);
        if (match) {
          const volume = parseInt(match[1]);
          console.log(`[GnomeShellAdapter] Current volume: ${volume}%`);
          return volume;
        }
      }
      return 50;
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to get volume:', e);
      return 50;
    }
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
        console.error(`[GnomeShellAdapter] bluetoothctl failed:`, error);
      }
    } catch (e) {
      console.error('[GnomeShellAdapter] Failed to set Bluetooth:', e);
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
    // Requires NMClient
    console.log(`Setting Wifi to ${enabled}`);
  }

  async connectToWifi(ssid: string): Promise<boolean> {
    console.log(`Connecting to Wifi ${ssid}`);
    return true;
  }

  getWifiState(): boolean {
    return true; // Mock
  }

  getBatteryLevel(): number {
    // Use UPower
    return 100; // Mock
  }

  isCharging(): boolean {
    return false; // Mock
  }

  getActiveApp(): string | null {
    // @ts-ignore
    const app = this.appSystem
      .get_running()
      .find((a: any) => a.state === Shell.AppState.RUNNING && a.is_active());
    return app ? app.get_name() : null;
  }

  onActiveAppChanged(callback: (appName: string) => void): void {
    // This is tricky in GJS, usually involves tracking window focus
    // Simplified for this example
    this.appListenerId = global.display.connect('notify::focus-window', () => {
      const app = this.getActiveApp();
      if (app) callback(app);
    });
  }

  destroy() {
    if (this.appListenerId) {
      global.display.disconnect(this.appListenerId);
    }
  }
}
