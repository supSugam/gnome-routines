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
}
