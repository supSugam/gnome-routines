import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class VolumeAction extends BaseAction {
    private previousVolume: number | null = null;

    constructor(id: string, config: { level: number }, adapter: SystemAdapter) {
        super(id, 'volume', config, adapter);
    }

    execute(): void {
        console.log(`[VolumeAction] Setting volume to: ${this.config.level}%`);
        try {
            this.previousVolume = this.adapter.getVolume();
            console.log(`[VolumeAction] Previous volume: ${this.previousVolume}%`);
            
            this.adapter.setVolume(this.config.level);
            console.log(`[VolumeAction] Volume set successfully`);
        } catch (e) {
            console.error(`[VolumeAction] Failed to execute:`, e);
        }
    }

    revert(): void {
        if (this.previousVolume !== null) {
            console.log(`[VolumeAction] Reverting volume to: ${this.previousVolume}%`);
            try {
                this.adapter.setVolume(this.previousVolume);
                console.log(`[VolumeAction] Volume reverted successfully`);
            } catch (e) {
                console.error(`[VolumeAction] Failed to revert:`, e);
            }
        }
    }
}
