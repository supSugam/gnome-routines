import { SystemAdapter as ISystemAdapter } from './adapter.js';

import { AudioAdapter } from './handlers/audio.js';
import { BluetoothAdapter } from './handlers/bluetooth.js';
import { DisplayAdapter } from './handlers/display.js';
import { NetworkAdapter } from './handlers/network.js';
import { PowerAdapter } from './handlers/power.js';
import { SystemAdapter as SysAdapter } from './handlers/system.js';
import { StartupAdapter } from './handlers/startup.js';
import { ClipboardAdapter } from './handlers/clipboard.js';

// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import GLib from 'gi://GLib';
// @ts-ignore
import Shell from 'gi://Shell';

declare const global: any;

export class GnomeShellAdapter implements ISystemAdapter {
  private _audio: AudioAdapter;
  private _bluetooth: BluetoothAdapter;
  private _display: DisplayAdapter;
  private _network: NetworkAdapter;
  private _power: PowerAdapter;
  private _system: SysAdapter;
  private _startup: StartupAdapter;
  private _clipboard: ClipboardAdapter;

  constructor() {
    this._audio = new AudioAdapter();
    this._bluetooth = new BluetoothAdapter();
    this._display = new DisplayAdapter();
    this._network = new NetworkAdapter();
    this._power = new PowerAdapter();
    this._system = new SysAdapter();
    this._startup = new StartupAdapter();
    this._clipboard = new ClipboardAdapter();
  }

  // --- Notification ---
  showNotification(config: any): void {
    this._system.showNotification(config);
  }

  // --- Settings ---
  setDND(enabled: boolean): void {
    this._system.setDND(enabled);
  }

  getDND(): boolean {
    return this._system.getDND();
  }

  setBrightness(percentage: number): void {
    this._display.setBrightness(percentage);
  }

  getBrightness(): number {
    return this._display.getBrightness();
  }

  setVolume(percentage: number): Promise<void> {
    return this._audio.setVolume(percentage);
  }

  getVolume(): Promise<number> {
    return this._audio.getVolume();
  }

  setBluetoothVolume(percentage: number): Promise<boolean> {
    return this._audio.setBluetoothVolume(percentage);
  }

  enforceVolume(percentage: number, durationMs: number): void {
    this._audio.enforceVolume(percentage, durationMs);
  }

  setSinkVolume(sinkName: string, percentage: number): void {
    // Stub
  }

  getBluetoothAudioSinkName(): string | null {
    return null; // Stub
  }

  setWallpaper(uri: string): void {
    this._display.setWallpaper(uri);
  }

  getWallpaper(): string {
    return this._display.getWallpaper();
  }

  onWallpaperChanged(callback: (newUri: string) => void): () => void {
    return this._display.onWallpaperChanged(callback);
  }

  setBluetooth(enabled: boolean): Promise<void> {
    return this._bluetooth.setBluetooth(enabled);
  }

  getBluetooth(): Promise<boolean> {
    return this._bluetooth.getBluetooth();
  }

  // --- Connectivity ---
  setWifi(enabled: boolean): void {
    this._network.setWifi(enabled);
  }

  connectToWifi(ssid: string): Promise<boolean> {
    // Promise<boolean> required
    return new Promise((resolve) => {
      this._network.connectToWifi(ssid);
      resolve(true);
    });
  }

  // --- State ---
  getWifiState(): boolean {
    return this._network.getWifiState();
  }

  getBatteryLevel(): number {
    return this._power.getBatteryLevel();
  }

  isCharging(): boolean {
    return this._power.isCharging();
  }

  // --- App Tracking ---
  getActiveApp(): string | null {
    // Stub
    return null;
  }

  onActiveAppChanged(callback: (appName: string) => void): () => void {
    // Stub
    return () => {};
  }

  // --- Startup State ---
  getStartupState(): { isStartup: boolean; timeSinceInit: number } {
    return this._startup.getStartupState();
  }

  // --- Network Tracking ---
  onWifiStateChanged(callback: (isConnected: boolean) => void): () => void {
    return this._network.onWifiStateChanged(callback);
  }

  getCurrentWifiSSID(): string | null {
    return this._network.getCurrentWifiSSID();
  }

  getSavedWifiNetworks(): string[] {
    return this._network.getSavedWifiNetworks();
  }

  // --- Wifi Power ---
  getWifiPowerState(): boolean {
    return this._network.getWifiPowerState();
  }

  onWifiPowerStateChanged(callback: (isEnabled: boolean) => void): () => void {
    return this._network.onWifiPowerStateChanged(callback);
  }

  // --- Bluetooth Tracking ---
  getBluetoothPowerState(): Promise<boolean> {
    return this._bluetooth.getBluetooth();
  }

  onBluetoothPowerStateChanged(
    callback: (isEnabled: boolean) => void
  ): () => void {
    return this._bluetooth.onBluetoothPowerStateChanged(callback);
  }

  getConnectedBluetoothDevices(): Promise<{ name: string; address: string }[]> {
    return this._bluetooth.getConnectedBluetoothDevices();
  }

  onBluetoothDeviceStateChanged(callback: () => void): () => void {
    return this._bluetooth.onBluetoothDeviceStateChanged(callback);
  }

  // --- Power & Battery ---

  onBatteryStateChanged(
    callback: (level: number, isCharging: boolean) => void
  ): () => void {
    return this._power.onBatteryStateChanged(callback);
  }

  getPowerSaverState(): Promise<boolean> {
    return Promise.resolve(this._power.getPowerSaver());
  }

  onPowerSaverStateChanged(callback: (isActive: boolean) => void): () => void {
    // Legacy wrapper
    return this._power.onPowerProfileChanged((profile) => {
      callback(profile === 'power-saver');
    });
  }

  // --- System Settings ---
  getDarkModeState(): boolean {
    return this._display.getDarkMode();
  }

  onDarkModeStateChanged(callback: (isDark: boolean) => void): () => void {
    return this._display.onDarkModeChanged(callback);
  }

  getAirplaneModeState(): Promise<boolean> {
    return Promise.resolve(this._network.getAirplaneModeState());
  }

  onAirplaneModeStateChanged(
    callback: (isEnabled: boolean) => void
  ): () => void {
    return this._network.onAirplaneModeStateChanged(callback);
  }

  onDndStateChanged(callback: (enabled: boolean) => void): () => void {
    return this._system.onDndStateChanged(callback);
  }

  // --- Audio ---
  getWiredHeadphonesState(): Promise<boolean> {
    return this._audio.getWiredHeadphonesState();
  }

  onWiredHeadphonesStateChanged(
    callback: (isConnected: boolean) => void
  ): () => void {
    return this._audio.onWiredHeadphonesStateChanged(callback);
  }

  // --- New Actions - Connections ---
  connectBluetoothDevice(id: string): Promise<void> {
    return this._bluetooth.connectBluetoothDevice(id);
  }

  disconnectBluetoothDevice(id: string): Promise<void> {
    return this._bluetooth.disconnectBluetoothDevice(id);
  }

  setAirplaneMode(enabled: boolean): void {
    this._network.setAirplaneMode(enabled);
    this._bluetooth.setBluetooth(!enabled);
  }

  // --- New Actions - Display ---
  setDarkMode(enabled: boolean): void {
    this._display.setDarkMode(enabled);
  }

  getDarkMode(): boolean {
    return this._display.getDarkMode();
  }

  setNightLight(enabled: boolean): void {
    this._display.setNightLight(enabled);
  }

  getNightLight(): boolean {
    return this._display.getNightLight();
  }

  setScreenTimeout(seconds: number): void {
    this._display.setScreenTimeout(seconds);
  }

  getScreenTimeout(): number {
    return this._display.getScreenTimeout();
  }

  setScreenOrientation(orientation: 'portrait' | 'landscape'): void {
    this._display.setScreenOrientation(orientation);
  }

  setRefreshRate(rate: number): Promise<void> {
    return this._display.setRefreshRate(rate);
  }

  getRefreshRate(): Promise<number> {
    return this._display.getRefreshRate();
  }

  getAvailableRefreshRates(): Promise<number[]> {
    return this._display.getAvailableRefreshRates();
  }

  // --- New Actions - Power ---
  setPowerSaver(enabled: boolean): void {
    this._power.setPowerSaver(enabled);
  }

  setPowerProfile(profile: string): void {
    this._power.setPowerProfile(profile);
  }

  getPowerSaver(): Promise<boolean> {
    return Promise.resolve(this._power.getPowerSaver());
  }

  getPowerProfile(): Promise<string> {
    return Promise.resolve(this._power.getPowerProfile());
  }

  // --- New Actions - Functions ---
  openLink(url: string): void {
    this._system.openLink(url);
  }

  takeScreenshot(directory?: string): void {
    this._system.takeScreenshot(directory || '');
  }

  executeCommand(command: string): void {
    this._system.executeCommand(command);
  }

  openApp(appIds: string[]): void {
    if (Array.isArray(appIds)) {
      appIds.forEach((id) => this._system.openApp(id));
    } else {
      // @ts-ignore
      this._system.openApp(appIds);
    }
  }

  // --- New Actions - Keyboard ---
  setKeyboardBrightness(percentage: number): void {
    this._display.setKeyboardBrightness(percentage);
  }

  getKeyboardBrightness(): Promise<number> {
    return this._display.getKeyboardBrightness();
  }

  // --- Clipboard ---
  getClipboardContent(): Promise<{
    type: 'text' | 'image' | 'other';
    content?: string;
  }> {
    return this._clipboard.getClipboardContent();
  }

  setClipboardText(text: string): void {
    this._clipboard.setClipboardText(text);
  }

  clearClipboard(): void {
    this._clipboard.clearClipboard();
  }

  onClipboardChanged(callback: () => void): () => void {
    return this._clipboard.onClipboardChanged(callback);
  }

  // --- Cleanup ---
  destroy(): void {
    // Cleanup handlers
    // @ts-ignore
    this._audio = null;
    // @ts-ignore
    this._bluetooth = null;
    // @ts-ignore
    this._display = null;
    // @ts-ignore
    this._network = null;
    // @ts-ignore
    this._power = null;
    // @ts-ignore
    this._system = null;
    // @ts-ignore
    this._startup = null;
    // @ts-ignore
    this._clipboard = null;
  }
}
