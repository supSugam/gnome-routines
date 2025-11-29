import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class BrightnessAction extends BaseAction {
    private previousBrightness: number | null = null;

    constructor(id: string, config: { level: number }, adapter: SystemAdapter) {
        super(id, 'brightness', config, adapter);
    }

    execute(): void {
        console.log(`[BrightnessAction] Setting brightness to: ${this.config.level}%`);
        try {
            this.previousBrightness = this.adapter.getBrightness();
            console.log(`[BrightnessAction] Previous brightness: ${this.previousBrightness}%`);
            
            this.adapter.setBrightness(this.config.level);
            console.log(`[BrightnessAction] Brightness set successfully`);
        } catch (e) {
            console.error(`[BrightnessAction] Failed to execute:`, e);
        }
    }

    revert(): void {
        if (this.previousBrightness !== null) {
            console.log(`[BrightnessAction] Reverting brightness to: ${this.previousBrightness}%`);
            try {
                this.adapter.setBrightness(this.previousBrightness);
                console.log(`[BrightnessAction] Brightness reverted successfully`);
            } catch (e) {
                console.error(`[BrightnessAction] Failed to revert:`, e);
            }
        }
    }
}
