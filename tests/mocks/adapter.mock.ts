import { SystemAdapter } from '../../src/gnome/adapters/adapter';

export class MockSystemAdapter implements SystemAdapter {
  notifications: { title: string; body: string }[] = [];
  wifiState: boolean = true;
  bluetoothState: boolean = true;
  connectedWifi: string | null = 'Home WiFi';
  dnd: boolean = false;
  brightness: number = 50;
  volume: number = 50;
  darkMode: boolean = false;
  nightLight: boolean = false;
  powerSaver: boolean = false;
  airplaneMode: boolean = false;
  wiredHeadphones: boolean = false;

  // Callbacks
  private wifiStateCallback?: (isConnected: boolean) => void;
  private bluetoothPowerCallback?: (isEnabled: boolean) => void;
  private batteryCallback?: (level: number, isCharging: boolean) => void;
  private powerSaverCallback?: (isActive: boolean) => void;
  private darkModeCallback?: (isDark: boolean) => void;
  private airplaneCallback?: (isEnabled: boolean) => void;
  private headphonesCallback?: (isConnected: boolean) => void;
  private clipboardCallback?: () => void;

  // Simulation Helpers
  simulateWifiChange(isConnected: boolean) {
    this.wifiState = isConnected;
    if (this.wifiStateCallback) this.wifiStateCallback(isConnected);
  }

  simulateBluetoothPowerChange(isEnabled: boolean) {
    this.bluetoothState = isEnabled;
    if (this.bluetoothPowerCallback) this.bluetoothPowerCallback(isEnabled);
  }

  simulateBatteryChange(level: number, isCharging: boolean) {
    if (this.batteryCallback) this.batteryCallback(level, isCharging);
  }

  simulatePowerSaverChange(isActive: boolean) {
    this.powerSaver = isActive;
    if (this.powerSaverCallback) this.powerSaverCallback(isActive);
  }

  simulateDarkModeChange(isDark: boolean) {
    this.darkMode = isDark;
    if (this.darkModeCallback) this.darkModeCallback(isDark);
  }

  simulateClipboardChange() {
    if (this.clipboardCallback) this.clipboardCallback();
  }

  // Notification
  // Notification
  showNotification(config: any): void {
    this.notifications.push({
      title: config.title,
      body: config.message || '',
    });
  }

  // Settings
  setDND(enabled: boolean): void {
    this.dnd = enabled;
  }
  getDND(): boolean {
    return this.dnd;
  }
  onDndStateChanged(callback: (enabled: boolean) => void): () => void {
    return () => {};
  }

  setBrightness(percentage: number): void {
    this.brightness = percentage;
  }
  getBrightness(): number {
    return this.brightness;
  }
  async setVolume(percentage: number): Promise<void> {
    this.volume = percentage;
  }
  async getVolume(): Promise<number> {
    return this.volume;
  }
  async setBluetoothVolume(percentage: number): Promise<boolean> {
    return true;
  }
  setSinkVolume(sinkName: string, percentage: number): void {}
  getBluetoothAudioSinkName(): string | null {
    return null;
  }
  setWallpaper(uri: string): void {}
  getWallpaper(): string {
    return '';
  }
  async setBluetooth(enabled: boolean): Promise<void> {
    this.bluetoothState = enabled;
    // In real adapter, changing setting might not immediately trigger callback until signal fires,
    // but for mock simplicity, we can optionaly trigger it or wait for simulate call.
    // Let's rely on explicit simulate for tests to be precise.
  }
  async getBluetooth(): Promise<boolean> {
    return this.bluetoothState;
  }

  // Connectivity
  setWifi(enabled: boolean): void {
    this.wifiState = enabled;
  }
  async connectToWifi(ssid: string): Promise<boolean> {
    this.connectedWifi = ssid;
    return true;
  }

  // State
  getWifiState(): boolean {
    return this.wifiState;
  }
  getBatteryLevel(): number {
    return 100;
  }
  isCharging(): boolean {
    return false;
  }

  // App Tracking
  getActiveApp(): string | null {
    return null;
  }
  onActiveAppChanged(callback: (appName: string) => void): () => void {
    return () => {};
  }

  // Startup State
  getStartupState(): { isStartup: boolean; timeSinceInit: number } {
    return { isStartup: false, timeSinceInit: 100000 };
  }

  // Network Tracking
  onWifiStateChanged(callback: (isConnected: boolean) => void): () => void {
    this.wifiStateCallback = callback;
    return () => {};
  }

  getCurrentWifiSSID(): string | null {
    return this.connectedWifi;
  }
  getSavedWifiNetworks(): string[] {
    return ['Home WiFi', 'Office WiFi'];
  }

  // Wifi Power
  getWifiPowerState(): boolean {
    return this.wifiState;
  }
  onWifiPowerStateChanged(callback: (isEnabled: boolean) => void): () => void {
    // Often same as state changed for simplicity in mock
    this.wifiStateCallback = callback;
    return () => {};
  }

  // Bluetooth Tracking
  async getBluetoothPowerState(): Promise<boolean> {
    return this.bluetoothState;
  }
  onBluetoothPowerStateChanged(
    callback: (isEnabled: boolean) => void
  ): () => void {
    this.bluetoothPowerCallback = callback;
    return () => {};
  }

  async getConnectedBluetoothDevices(): Promise<
    { name: string; address: string }[]
  > {
    return [];
  }
  onBluetoothDeviceStateChanged(callback: () => void): () => void {
    return () => {};
  }

  // Power & Battery
  onBatteryStateChanged(
    callback: (level: number, isCharging: boolean) => void
  ): () => void {
    this.batteryCallback = callback;
    return () => {};
  }

  async getPowerSaverState(): Promise<boolean> {
    return this.powerSaver;
  }

  onPowerSaverStateChanged(callback: (isActive: boolean) => void): () => void {
    this.powerSaverCallback = callback;
    return () => {};
  }

  // System Settings
  getDarkModeState(): boolean {
    return this.darkMode;
  }
  onDarkModeStateChanged(callback: (isDark: boolean) => void): () => void {
    this.darkModeCallback = callback;
    return () => {};
  }

  async getAirplaneModeState(): Promise<boolean> {
    return this.airplaneMode;
  }

  onAirplaneModeStateChanged(
    callback: (isEnabled: boolean) => void
  ): () => void {
    this.airplaneCallback = callback;
    return () => {};
  }

  // Audio
  async getWiredHeadphonesState(): Promise<boolean> {
    return this.wiredHeadphones;
  }

  onWiredHeadphonesStateChanged(
    callback: (isConnected: boolean) => void
  ): () => void {
    this.headphonesCallback = callback;
    return () => {};
  }

  // New Actions - Connections
  async connectBluetoothDevice(id: string): Promise<void> {}
  async disconnectBluetoothDevice(id: string): Promise<void> {}

  setAirplaneMode(enabled: boolean): void {
    this.airplaneMode = enabled;
  }

  // New Actions - Display
  setDarkMode(enabled: boolean): void {
    this.darkMode = enabled;
  }
  getDarkMode(): boolean {
    return this.darkMode;
  }
  setNightLight(enabled: boolean): void {
    this.nightLight = enabled;
  }
  getNightLight(): boolean {
    return this.nightLight;
  }
  setScreenTimeout(seconds: number): void {}
  getScreenTimeout(): number {
    return 60;
  }
  setScreenOrientation(orientation: 'portrait' | 'landscape'): void {}
  async setRefreshRate(rate: number): Promise<void> {}
  async getRefreshRate(): Promise<number> {
    return 60;
  }
  async getAvailableRefreshRates(): Promise<number[]> {
    return [60, 144];
  }

  // New Actions - Power
  setPowerSaver(enabled: boolean): void {
    this.powerSaver = enabled;
  }
  async getPowerSaver(): Promise<boolean> {
    return this.powerSaver;
  }

  // New Actions - Functions
  openLink(url: string): void {}
  takeScreenshot(directory?: string): void {}
  openApp(appIds: string[]): void {}
  executeCommand(command: string): void {}

  // New Actions - Keyboard
  setKeyboardBrightness(percentage: number): void {}
  async getKeyboardBrightness(): Promise<number> {
    return 50;
  }

  // Clipboard
  async getClipboardContent(): Promise<{
    type: 'text' | 'image' | 'other';
    content?: string;
  }> {
    return { type: 'text', content: '' };
  }
  setClipboardText(text: string): void {}
  clearClipboard(): void {}
  onClipboardChanged(callback: () => void): () => void {
    this.clipboardCallback = callback;
    return () => {};
  }
}
