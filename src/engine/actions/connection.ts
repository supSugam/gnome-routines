import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class WifiAction extends BaseAction {
    private adapter: SystemAdapter;

    constructor(id: string, config: { enabled: boolean }, adapter: SystemAdapter) {
        super(id, 'wifi', config);
        this.adapter = adapter;
    }

    async execute(): Promise<void> {
        this.adapter.setWifi(this.config.enabled);
    }

    async revert(): Promise<void> {
        // Revert to previous state?
        // For simplicity, we just toggle back
        this.adapter.setWifi(!this.config.enabled);
    }
}

export class BluetoothAction extends BaseAction {
    private adapter: SystemAdapter;

    constructor(id: string, config: { enabled: boolean }, adapter: SystemAdapter) {
        super(id, 'bluetooth', config);
        this.adapter = adapter;
    }

    async execute(): Promise<void> {
        this.adapter.setBluetooth(this.config.enabled);
    }

    async revert(): Promise<void> {
        this.adapter.setBluetooth(!this.config.enabled);
    }
}

export class BluetoothDeviceAction extends BaseAction {
    private adapter: SystemAdapter;

    constructor(id: string, config: { deviceId: string, action: 'connect' | 'disconnect' }, adapter: SystemAdapter) {
        super(id, 'bluetooth_device', config);
        this.adapter = adapter;
    }

    async execute(): Promise<void> {
        if (this.config.action === 'connect') {
            this.adapter.connectBluetoothDevice(this.config.deviceId);
        } else {
            this.adapter.disconnectBluetoothDevice(this.config.deviceId);
        }
    }

    async revert(): Promise<void> {
        if (this.config.action === 'connect') {
            this.adapter.disconnectBluetoothDevice(this.config.deviceId);
        } else {
            this.adapter.connectBluetoothDevice(this.config.deviceId);
        }
    }
}

export class AirplaneModeAction extends BaseAction {
    private adapter: SystemAdapter;

    constructor(id: string, config: { enabled: boolean }, adapter: SystemAdapter) {
        super(id, 'airplane_mode', config);
        this.adapter = adapter;
    }

    async execute(): Promise<void> {
        this.adapter.setAirplaneMode(this.config.enabled);
    }

    async revert(): Promise<void> {
        this.adapter.setAirplaneMode(!this.config.enabled);
    }
}
