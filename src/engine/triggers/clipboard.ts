import { BaseTrigger } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class ClipboardTrigger extends BaseTrigger {
    private adapter: SystemAdapter;

    constructor(id: string, config: { contentType: 'any' | 'text' | 'image' | 'regex', regex?: string }, adapter: SystemAdapter) {
        super(id, 'clipboard', config);
        this.adapter = adapter;
    }

    activate(): void {
        this.adapter.onClipboardChanged(() => {
            console.log(`[ClipboardTrigger] Clipboard content changed. Checking match...`);
            this.checkAndEmit();
        });
    }

    private async checkAndEmit() {
        if (await this.check()) {
            console.log(`[ClipboardTrigger] Match found! Emitting triggered.`);
            this.emit('triggered');
        }
    }

    async check(): Promise<boolean> {
        const content = await this.adapter.getClipboardContent();
        
        if (this.config.contentType === 'any') {
            return true;
        }

        if (this.config.contentType === 'text') {
            return content.type === 'text';
        }

        if (this.config.contentType === 'image') {
            // Since our adapter currently returns 'other' for non-text, 
            // and we can't easily distinguish image from other files without more complex logic,
            // we might have to accept 'other' as potential image or refine adapter later.
            // For now, let's assume 'other' might be image, or strictly 'image' if we improve adapter.
            // Given current adapter implementation:
            return content.type === 'image' || content.type === 'other'; 
        }

        if (this.config.contentType === 'regex' && this.config.regex && content.type === 'text' && content.content) {
            try {
                const regex = new RegExp(this.config.regex);
                return regex.test(content.content);
            } catch (e) {
                console.error(`[ClipboardTrigger] Invalid regex: ${this.config.regex}`, e);
                return false;
            }
        }

        return false;
    }
}
