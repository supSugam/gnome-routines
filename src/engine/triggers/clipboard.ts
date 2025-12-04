import { BaseTrigger } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
// @ts-ignore
import GLib from 'gi://GLib';

export class ClipboardTrigger extends BaseTrigger {
  private adapter: SystemAdapter;

  constructor(
    id: string,
    config: { contentType: 'any' | 'text' | 'image' | 'regex'; regex?: string },
    adapter: SystemAdapter
  ) {
    super(id, 'clipboard', config);
    this.adapter = adapter;
  }

  private _hasTriggered: boolean = false;
  private debounceId: number | null = null;

  activate(): void {
    this.adapter.onClipboardChanged(() => {
      if (this.debounceId) {
        GLib.source_remove(this.debounceId);
        this.debounceId = null;
      }

      this.debounceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
        this.debounceId = null;
        console.log(
          `[ClipboardTrigger] Clipboard content changed (debounced). Checking match...`
        );
        // We need to verify if it matches the config before setting the flag
        this.verifyMatch().then((isMatch) => {
          if (isMatch) {
            console.log(
              `[ClipboardTrigger] Match confirmed. Setting trigger flag.`
            );
            this._hasTriggered = true;
            this.emit('triggered');
          }
        });
        return false;
      });
    });
  }

  private async verifyMatch(): Promise<boolean> {
    const content = await this.adapter.getClipboardContent();

    if (this.config.contentType === 'any') {
      return true;
    }

    if (this.config.contentType === 'text') {
      return content.type === 'text';
    }

    if (this.config.contentType === 'image') {
      return content.type === 'image' || content.type === 'other';
    }

    if (
      this.config.contentType === 'regex' &&
      this.config.regex &&
      content.type === 'text' &&
      content.content
    ) {
      try {
        const regex = new RegExp(this.config.regex);
        return regex.test(content.content);
      } catch (e) {
        console.error(
          `[ClipboardTrigger] Invalid regex: ${this.config.regex}`,
          e
        );
        return false;
      }
    }

    return false;
  }

  async check(): Promise<boolean> {
    // Return the momentary state and reset it
    const triggered = this._hasTriggered;
    // Only reset if it was true?
    // If we reset it here, we assume check() is called exactly once per event processing.
    // RoutineManager calls check() in evaluate().
    if (triggered) {
      this._hasTriggered = false;
    }
    return triggered;
  }
}
