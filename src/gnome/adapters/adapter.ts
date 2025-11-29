export interface SystemAdapter {
    // Notification
    showNotification(title: string, body: string): void;

    // Settings
    setDND(enabled: boolean): void;
    setBrightness(percentage: number): void;
    setWallpaper(uri: string): void;
    getWallpaper(): string;
    
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
