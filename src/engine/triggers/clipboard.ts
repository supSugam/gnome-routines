import debugLog from '../../utils/log.js';
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
    super(id, TriggerType.CLIPBOARD, config);
    this.adapter = adapter;
  }

  private _lastContent: string | undefined;
  private _hasTriggered: boolean = false;
  private debounceId: number | null = null;
  public _isActivated: boolean = false;
  private cleanup: (() => void) | null = null;

  activate(): void {
    debugLog(
      '[ClipboardTrigger] Activating trigger. Registering callback with adapter...'
    );

    // Initialize basline
    this.adapter.getClipboardContent().then((res) => {
      this._lastContent = res.content;
    });

    this.cleanup = this.adapter.onClipboardChanged(() => {
      debugLog(
        '[ClipboardTrigger] Adapter reported change (Event). Waiting for sync...'
      );

      // We must wait a brief moment for the clipboard content to actually populate
      // in the St.Clipboard API after the ownership change signal.
      // This is NOT polling; it is a single synchronization delay.
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
        this.adapter.getClipboardContent().then((res) => {
          const currentContent = res.content;

          // Only deduplicate text content.
          // For images/other, we don't have the bytes to compare, so we assume it's new.
          // This prevents the issue where copying two different images results in both being 'undefined' and ignored.
          const isSame =
            res.type === 'text' && currentContent === this._lastContent;

          debugLog(
            `[ClipboardTrigger] Content fetched. Type: ${res.type}, Length: ${
              res.content?.length ?? 0
            }`
          );

          if (isSame) {
            debugLog(
              '[ClipboardTrigger] Content identical to last trigger. Ignoring.'
            );
            return;
          }

          this._lastContent = currentContent;

          // Logic for config match
          let isMatch = false;
          const contentType = this.config.contentType || 'any';
          debugLog(
            `[ClipboardTrigger] Checking match. Config: ${contentType}, Regex: ${this.config.regex}, ResType: ${res.type}`
          );

          if (contentType === 'any') isMatch = true;
          else if (contentType === 'text') isMatch = res.type === 'text';
          else if (contentType === 'image')
            isMatch = res.type === 'image' || res.type === 'other';
          else if (
            this.config.contentType === 'regex' &&
            this.config.regex &&
            res.type === 'text' &&
            res.content
          ) {
            try {
              isMatch = new RegExp(this.config.regex).test(res.content);
            } catch (e) {
              isMatch = false;
            }
          }

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
        return false; // Single execution
      });
    });
    this._isActivated = true;
  }

  deactivate(): void {
    if (!this._isActivated) return;

    debugLog('[ClipboardTrigger] Deactivating trigger.');
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
    if (this.debounceId) {
      GLib.source_remove(this.debounceId);
      this.debounceId = null;
    }
    this._isActivated = false;
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
