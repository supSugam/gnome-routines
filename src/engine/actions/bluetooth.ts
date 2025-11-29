import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class BluetoothAction extends BaseAction {
    private previousBluetoothState: boolean | null = null;

    constructor(id: string, config: { enabled: boolean }, adapter: SystemAdapter) {
        super(id, 'bluetooth', config, adapter);
    }

    execute(): void {
        console.log(`[BluetoothAction] Setting Bluetooth to: ${this.config.enabled}`);
        try {
            this.previousBluetoothState = this.adapter.getBluetooth();
            console.log(`[BluetoothAction] Previous Bluetooth state: ${this.previousBluetoothState}`);
            
            this.adapter.setBluetooth(this.config.enabled);
            console.log(`[BluetoothAction] Bluetooth set successfully`);
        } catch (e) {
            console.error(`[BluetoothAction] Failed to execute:`, e);
        }
    }

    revert(): void {
        if (this.previousBluetoothState !== null) {
            console.log(`[BluetoothAction] Reverting Bluetooth to: ${this.previousBluetoothState}`);
            try {
                this.adapter.setBluetooth(this.previousBluetoothState);
                console.log(`[BluetoothAction] Bluetooth reverted successfully`);
            } catch (e) {
                console.error(`[BluetoothAction] Failed to revert:`, e);
            }
        }
    }
}
