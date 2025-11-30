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

  getConnectedBluetoothDevices(): string[] {
    try {
      // @ts-ignore
      const Gio = imports.gi.Gio;
      // We need to use ObjectManager to find all devices
      // This is complex in raw DBus without a generated proxy.
      // Alternative: bluetoothctl devices Connected
      // @ts-ignore
      const GLib = imports.gi.GLib;
      const [success, stdout] = GLib.spawn_command_line_sync(
        'bluetoothctl devices Connected'
      );
      if (success && stdout) {
        const output = new TextDecoder().decode(stdout);
        // Output format: "Device XX:XX:XX:XX:XX:XX Name"
        const devices: string[] = [];
        output.split('\n').forEach((line) => {
          const match = line.match(/^Device\s+([0-9A-F:]+)\s+(.+)$/i);
          if (match) {
            // We use the Name (alias) for user friendliness, or MAC?
            // User asked for "known bluetooth devices". Usually names are better.
            // Let's store Name.
            devices.push(match[2]);
          }
        });
        return devices;
      }
      return [];
    } catch (e) {
      console.error(
        '[GnomeShellAdapter] Failed to get connected Bluetooth devices:',
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
        'org.bluez',
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
          if (
            interfaceName === 'org.bluez.Device1' &&
            changedProps.Connected !== undefined
          ) {
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
