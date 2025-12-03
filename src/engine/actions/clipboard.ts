import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class ClipboardAction extends BaseAction {
    constructor(id: string, config: { operation: 'clear' | 'replace', find?: string, replace?: string }, adapter: SystemAdapter) {
        super(id, 'clipboard', config, adapter);
    }

    async execute(): Promise<void> {
        console.log(`[ClipboardAction] Executing operation: ${this.config.operation}`);
        
        if (this.config.operation === 'clear') {
            this.adapter.clearClipboard();
            console.log(`[ClipboardAction] Clipboard cleared.`);
        } else if (this.config.operation === 'replace') {
            const content = await this.adapter.getClipboardContent();
            if (content.type === 'text' && content.content) {
                let newText = content.content;
                if (this.config.find && this.config.replace !== undefined) {
                    try {
                        const regex = new RegExp(this.config.find, 'g');
                        newText = newText.replace(regex, this.config.replace);
                        this.adapter.setClipboardText(newText);
                        console.log(`[ClipboardAction] Clipboard text replaced.`);
                    } catch (e) {
                        console.error(`[ClipboardAction] Invalid regex or replace failed:`, e);
                    }
                }
            } else {
                console.log(`[ClipboardAction] Clipboard content is not text, skipping replace.`);
            }
        }
    }

    revert(): void {
        // Reverting clipboard changes is complex (need history).
        // For now, no-op.
    }
}
