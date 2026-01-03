// @ts-ignore
import St from 'gi://St';
// @ts-ignore
import GLib from 'gi://GLib';
// @ts-ignore
// @ts-ignore
import Meta from 'gi://Meta';
// @ts-ignore
import Shell from 'gi://Shell';
import debugLog from '../../../utils/log.js';

export class ClipboardAdapter {
  getClipboardContent(): Promise<{
    type: 'text' | 'image' | 'other';
    content?: string;
  }> {
    return new Promise((resolve) => {
      try {
        const clipboard = St.Clipboard.get_default();
        clipboard.get_text(
          St.ClipboardType.CLIPBOARD,
          (clipboard: any, text: string) => {
            if (text) {
              resolve({ type: 'text', content: text });
            } else {
              // Image checking is harder in St.Clipboard without callback complexity
              // Assume empty or other for now
              resolve({ type: 'other' });
            }
          }
        );
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
    try {
      const display = Shell.Global.get().get_display();
      const selection = display.get_selection();

      // Connect to 'owner-changed' signal
      const signalId = selection.connect(
        'owner-changed',
        (_: any, selectionType: any, _selectionSource: any) => {
          if (selectionType === Meta.SelectionType.SELECTION_CLIPBOARD) {
            debugLog('[ClipboardAdapter] Clipboard owner changed (Event).');
            callback();
          }
        }
      );

      debugLog(
        '[ClipboardAdapter] Connected to clipboard owner-changed signal.'
      );

      return () => {
        try {
          if (signalId) {
            selection.disconnect(signalId);
            debugLog('[ClipboardAdapter] Disconnected from clipboard signal.');
          }
        } catch (e) {
          debugLog('[ClipboardAdapter] Error disconnecting signal:', e);
        }
      };
    } catch (e) {
      debugLog(
        '[ClipboardAdapter] Failed to connect to clipboard signal. Falling back to polling.',
        e
      );

      // Fallback to polling if signal fails
      let lastContent: string | undefined;
      const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
        this.getClipboardContent().then((res) => {
          if (res.content !== lastContent) {
            lastContent = res.content;
            callback();
          }
        });
        return true;
      });
      return () => GLib.source_remove(id);
    }
  }
}
