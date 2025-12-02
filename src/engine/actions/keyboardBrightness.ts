import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class KeyboardBrightnessAction extends BaseAction {
    private previousBrightness: number | null = null;

    constructor(id: string, config: { level: number }, adapter: SystemAdapter) {
        super(id, 'keyboard_brightness', config, adapter);
    }

    async execute(): Promise<void> {
        console.log(`[KeyboardBrightnessAction] Setting keyboard brightness to: ${this.config.level}%`);
        try {
            this.previousBrightness = await this.adapter.getKeyboardBrightness();
            console.log(`[KeyboardBrightnessAction] Previous brightness: ${this.previousBrightness}%`);
            
            this.adapter.setKeyboardBrightness(this.config.level);
            console.log(`[KeyboardBrightnessAction] Keyboard brightness set successfully`);
        } catch (e) {
            console.error(`[KeyboardBrightnessAction] Failed to execute:`, e);
        }
    }

    revert(): void {
        if (this.previousBrightness !== null) {
            console.log(`[KeyboardBrightnessAction] Reverting keyboard brightness to: ${this.previousBrightness}%`);
            try {
                this.adapter.setKeyboardBrightness(this.previousBrightness);
                console.log(`[KeyboardBrightnessAction] Keyboard brightness reverted successfully`);
            } catch (e) {
                console.error(`[KeyboardBrightnessAction] Failed to revert:`, e);
            }
        }
    }
}
