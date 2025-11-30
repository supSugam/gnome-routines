export interface SystemAdapter {
  // Notification
  showNotification(title: string, body: string): void;

  // Settings
  setDND(enabled: boolean): void;
  getDND(): boolean;
  setBrightness(percentage: number): void;
  getBrightness(): number;
  setVolume(percentage: number): void;
  getVolume(): number;
  setWallpaper(uri: string): void;
  getWallpaper(): string;
  setBluetooth(enabled: boolean): void;
  getBluetooth(): boolean;

  // Connectivity
  setWifi(enabled: boolean): void;
  connectToWifi(ssid: string): Promise<boolean>;

  // State
  getWifiState(): boolean;
  getBatteryLevel(): number;
  isCharging(): boolean;

  // App Tracking
  getActiveApp(): string | null;
  onActiveAppChanged(callback: (appName: string) => void): void;

  // Network Tracking
  onWifiStateChanged(callback: (isConnected: boolean) => void): void;
  getCurrentWifiSSID(): string | null;
  getSavedWifiNetworks(): string[];

  // Wifi Power
  getWifiPowerState(): boolean;
  onWifiPowerStateChanged(callback: (isEnabled: boolean) => void): void;

  // Bluetooth Tracking
  getBluetoothPowerState(): boolean;
  onBluetoothPowerStateChanged(callback: (isEnabled: boolean) => void): void;
  getConnectedBluetoothDevices(): string[]; // Returns list of device names/aliases
  onBluetoothDeviceStateChanged(callback: () => void): void;

  // Power & Battery
  getBatteryLevel(): number;
  isCharging(): boolean;
  onBatteryStateChanged(
    callback: (level: number, isCharging: boolean) => void
  ): void;

  getPowerSaverState(): boolean;
  onPowerSaverStateChanged(callback: (isActive: boolean) => void): void;

  // System Settings
  getDarkModeState(): boolean;
  onDarkModeStateChanged(callback: (isDark: boolean) => void): void;

  getAirplaneModeState(): boolean;
  onAirplaneModeStateChanged(callback: (isEnabled: boolean) => void): void;

  // Audio
  getWiredHeadphonesState(): boolean;
  onWiredHeadphonesStateChanged(callback: (isConnected: boolean) => void): void;

  // New Actions - Connections
  connectBluetoothDevice(id: string): void;
  disconnectBluetoothDevice(id: string): void;
  setAirplaneMode(enabled: boolean): void;

  // New Actions - Display
  setDarkMode(enabled: boolean): void;
  getDarkMode(): boolean;
  setNightLight(enabled: boolean): void;
  getNightLight(): boolean;
  setScreenTimeout(seconds: number): void;
  getScreenTimeout(): number;
  setScreenOrientation(orientation: 'portrait' | 'landscape'): void;
  setRefreshRate(rate: number): void;

  // New Actions - Power
  setPowerSaver(enabled: boolean): void;
  getPowerSaver(): boolean;

  // New Actions - Functions
  openLink(url: string): void;
  takeScreenshot(): void;
  openApp(appIds: string[]): void;
}
