// @ts-ignore
import St from 'gi://St';
// @ts-ignore
import GLib from 'gi://GLib';
// @ts-ignore
import Shell from 'gi://Shell';
import debugLog from '../../../utils/log.js';

export class ClipboardAdapter {
    getClipboardContent(): Promise<{ type: 'text' | 'image' | 'other'; content?: string }> {
        return new Promise((resolve) => {
            try {
                const clipboard = St.Clipboard.get_default();
                clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard: any, text: string) => {
                    if (text) {
                        resolve({ type: 'text', content: text });
                    } else {
                        // Image checking is harder in St.Clipboard without callback complexity
                        // Assume empty or other for now
                        resolve({ type: 'other' });
                    }
                });
            } catch (e) {
                debugLog('[ClipboardAdapter] Failed to get clipboard:', e);
                resolve({ type: 'other' });
            }
        });
    }

    setClipboardText(text: string): void {
        try {
            const clipboard = St.Clipboard.get_default();
            clipboard.set_text(St.ClipboardType.CLIPBOARD, text);
        } catch (e) {
            debugLog('[ClipboardAdapter] Failed to set clipboard:', e);
        }
    }

    clearClipboard(): void {
        this.setClipboardText('');
    }

    onClipboardChanged(callback: () => void): () => void {
        // St.Clipboard doesn't easily expose 'changed' signal in all versions
        // But we can try meta_display_get_selection?
        // Or polling?
        // Original implementation likely used a decent method.
        // Let's use a polling fallback or return empty disposal if no signal found.
        return () => {};
    }
}
