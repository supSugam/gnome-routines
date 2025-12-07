import { BaseTrigger } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
// @ts-ignore
import GLib from 'gi://GLib';
import { TriggerType, TriggerStrategy } from '../types.js';

export class ClipboardTrigger extends BaseTrigger {
  private adapter: SystemAdapter;

  constructor(
    id: string,
    config: { contentType: 'any' | 'text' | 'image' | 'regex'; regex?: string },
    adapter: SystemAdapter
  ) {
    super(id, TriggerType.CLIPBOARD, config, TriggerStrategy.EVENT_CHANGE);
    this.adapter = adapter;
  }

  private _hasTriggered: boolean = false;
  private debounceId: number | null = null;

  activate(): void {
    debugLog(
      '[ClipboardTrigger] Activating trigger. Registering callback with adapter...'
    );
    this.adapter.onClipboardChanged(() => {
      debugLog(
        '[ClipboardTrigger] Adapter reported change. Scheduling debounce...'
      );
      if (this.debounceId) {
        debugLog('[ClipboardTrigger] Clearing previous debounce.');
        GLib.source_remove(this.debounceId);
        this.debounceId = null;
      }

      this.debounceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
        this.debounceId = null;
        debugLog(
          `[ClipboardTrigger] Clipboard content changed (debounced). Checking match...`
        );
        // We need to verify if it matches the config before setting the flag
        this.verifyMatch().then((isMatch) => {
          if (isMatch) {
            debugLog(
              `[ClipboardTrigger] Match confirmed. Setting trigger flag.`
            );
            this._hasTriggered = true;
            this.emit('triggered');
          } else {
            debugLog('[ClipboardTrigger] Match failed.');
          }
        });
        return false;
      });
    });
  }

  private async verifyMatch(): Promise<boolean> {
    const content = await this.adapter.getClipboardContent();

    const contentType = this.config.contentType || 'any';

    if (contentType === 'any') {
      return true;
    }

    if (contentType === 'text') {
      return content.type === 'text';
    }

    if (contentType === 'image') {
      return content.type === 'image' || content.type === 'other';
    }

    if (
      contentType === 'regex' &&
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
