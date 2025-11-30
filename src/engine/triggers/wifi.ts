import { BaseTrigger } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class WifiTrigger extends BaseTrigger {
    private adapter: SystemAdapter;
    public _isActivated: boolean = false;

    constructor(id: string, config: { state: 'connected' | 'disconnected' | 'enabled' | 'disabled', ssids?: string[] }, adapter: SystemAdapter) {
        super(id, 'wifi', config);
        this.adapter = adapter;
    }

    async check(): Promise<boolean> {
        // Power state check
        if (this.config.state === 'enabled' || this.config.state === 'disabled') {
            const isEnabled = this.adapter.getWifiPowerState();
            console.log(`[WifiTrigger] Checking power state. Current: ${isEnabled}, Target: ${this.config.state}`);
            return this.config.state === 'enabled' ? isEnabled : !isEnabled;
        }

        // Connection state check
        const isConnected = this.adapter.getWifiState();
        const currentSSID = this.adapter.getCurrentWifiSSID();
        
        console.log(`[WifiTrigger] Checking connection state. Current: ${isConnected} (${currentSSID}), Target: ${this.config.state}`);
        
        // If specific networks are configured
        if (this.config.ssids && this.config.ssids.length > 0) {
            if (this.config.state === 'connected') {
                // Must be connected AND to one of the allowed SSIDs
                return isConnected && currentSSID !== null && this.config.ssids.includes(currentSSID);
            } else {
                // Disconnected logic with specific networks
                return currentSSID === null || !this.config.ssids.includes(currentSSID);
            }
        }

        // Default behavior (any network)
        if (this.config.state === 'connected') {
            return isConnected;
        } else {
            return !isConnected;
        }
    }

    activate(): void {
        if (this._isActivated) return;
        
        console.log(`[WifiTrigger] Activating listener for ${this.config.state}`);
        
        if (this.config.state === 'enabled' || this.config.state === 'disabled') {
            this.adapter.onWifiPowerStateChanged((isEnabled: boolean) => {
                console.log(`[WifiTrigger] Wifi power changed to: ${isEnabled}`);
                this.emit('triggered');
            });
        } else {
            this.adapter.onWifiStateChanged((isConnected: boolean) => {
                console.log(`[WifiTrigger] Wifi connection state changed to: ${isConnected}`);
                this.emit('triggered');
            });
        }
        
        this._isActivated = true;
    }
}
