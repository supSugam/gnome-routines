import { BaseTrigger } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class BluetoothTrigger extends BaseTrigger {
    private adapter: SystemAdapter;
    public _isActivated: boolean = false;

    constructor(id: string, config: { state: 'connected' | 'disconnected' | 'enabled' | 'disabled', deviceIds?: string[] }, adapter: SystemAdapter) {
        super(id, 'bluetooth', config);
        this.adapter = adapter;
    }

    async check(): Promise<boolean> {
        // Power state check
        if (this.config.state === 'enabled' || this.config.state === 'disabled') {
            const isEnabled = this.adapter.getBluetoothPowerState();
            console.log(`[BluetoothTrigger] Checking power state. Current: ${isEnabled}, Target: ${this.config.state}`);
            return this.config.state === 'enabled' ? isEnabled : !isEnabled;
        }

        // Connection state check
        const connectedDevices = this.adapter.getConnectedBluetoothDevices();
        console.log(`[BluetoothTrigger] Checking connection state. Connected: ${connectedDevices.join(', ')}, Target: ${this.config.state}`);
        
        // If specific devices are configured
        if (this.config.deviceIds && this.config.deviceIds.length > 0) {
            if (this.config.state === 'connected') {
                // Must be connected to AT LEAST ONE of the allowed devices
                return connectedDevices.some(id => this.config.deviceIds!.includes(id));
            } else {
                // Disconnected from ALL of the specific devices
                // (i.e. none of the specific devices are currently connected)
                return !connectedDevices.some(id => this.config.deviceIds!.includes(id));
            }
        }

        // Default behavior (any device)
        const isAnyConnected = connectedDevices.length > 0;
        if (this.config.state === 'connected') {
            return isAnyConnected;
        } else {
            return !isAnyConnected;
        }
    }

    activate(): void {
        if (this._isActivated) return;
        
        console.log(`[BluetoothTrigger] Activating listener for ${this.config.state}`);
        
        if (this.config.state === 'enabled' || this.config.state === 'disabled') {
            this.adapter.onBluetoothPowerStateChanged((isEnabled: boolean) => {
                console.log(`[BluetoothTrigger] Bluetooth power changed to: ${isEnabled}`);
                this.emit('triggered');
            });
        } else {
            this.adapter.onBluetoothDeviceStateChanged(() => {
                console.log(`[BluetoothTrigger] Bluetooth device state changed`);
                this.emit('triggered');
            });
        }
        
        this._isActivated = true;
    }
}
