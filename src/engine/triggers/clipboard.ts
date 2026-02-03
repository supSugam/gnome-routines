import debugLog from '../../utils/log.js';
import { BaseTrigger } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
// @ts-ignore
import GLib from 'gi://GLib';
import { TriggerType } from '../types.js';

/**
 * ClipboardTrigger
 */
export class ClipboardTrigger extends BaseTrigger {
  private adapter: SystemAdapter;
  private _baselineHash: string | null = null;
  private _hasTriggered: boolean = false;
  public _isActivated: boolean = false;
  private cleanup: (() => void) | null = null;
  private syncTimeoutId: number | null = null;
  private _baselineEstablished: boolean = false;

  constructor(
    id: string,
    config: { contentType: 'any' | 'text' | 'image' | 'regex'; regex?: string },
    adapter: SystemAdapter
  ) {
    super(id, TriggerType.CLIPBOARD, config);
    this.adapter = adapter;
  }

  private hashContent(
    type: 'text' | 'image' | 'other',
    content: string | undefined
  ): string {
    return `${type}:${content ?? ''}`;
  }

  activate(): void {
    debugLog('[ClipboardTrigger] Activating...');

    this._baselineEstablished = false;
    this._baselineHash = null;

    this.cleanup = this.adapter.onClipboardChanged(() => {
      this.handleClipboardChange();
    });

    debugLog(
      '[ClipboardTrigger] Waiting for first event to establish baseline...'
    );
  }

  private handleClipboardChange(): void {
    // Debounce
    if (this.syncTimeoutId !== null) {
      GLib.source_remove(this.syncTimeoutId);
      this.syncTimeoutId = null;
    }

    this.syncTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
      this.syncTimeoutId = null;
      this.processClipboardEvent();

      return GLib.SOURCE_REMOVE;
    });
  }

  private processClipboardEvent(): void {
    this.adapter
      .getClipboardContent()
      .then((res) => {
        const currentHash = this.hashContent(res.type, res.content);

        // Baseline initialization
        if (!this._baselineEstablished) {
          this._baselineHash = currentHash;
          this._baselineEstablished = true;
          debugLog(
            `[ClipboardTrigger] Baseline established: ${currentHash.substring(0, 50)}...`
          );

          return;
        }

        // Check change
        if (currentHash === this._baselineHash) {
          debugLog(
            '[ClipboardTrigger] No actual change (same hash). Ignoring.'
          );

          return;
        }

        debugLog(
          `[ClipboardTrigger] REAL change detected: ${currentHash.substring(0, 50)}...`
        );
        this._baselineHash = currentHash;

        if (this.matchesConfig(res)) {
          debugLog('[ClipboardTrigger] Filter matched. Triggering!');
          this._hasTriggered = true;
          this.emit('triggered');
        } else {
          debugLog('[ClipboardTrigger] Filter not matched.');
        }
      })
      .catch((e) => {
        debugLog('[ClipboardTrigger] Failed to get clipboard content:', e);
      });
  }

  private matchesConfig(res: {
    type: 'text' | 'image' | 'other';
    content?: string;
  }): boolean {
    const contentType = this.config.contentType || 'any';

    switch (contentType) {
      case 'any':
        return true;

      case 'text':
        return res.type === 'text';

      case 'image':
        return res.type === 'image' || res.type === 'other';

      case 'regex':
        if (!this.config.regex || res.type !== 'text' || !res.content) {
          return false;
        }

        try {
          return new RegExp(this.config.regex).test(res.content);
        } catch {
          return false;
        }

      default:
        return false;
    }
  }

  deactivate(): void {
    debugLog('[ClipboardTrigger] Deactivating...');

    if (this.syncTimeoutId !== null) {
      GLib.source_remove(this.syncTimeoutId);
      this.syncTimeoutId = null;
    }

    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }

    this._baselineHash = null;
    this._baselineEstablished = false;
  }

  async check(): Promise<boolean> {
    const triggered = this._hasTriggered;

    if (triggered) {
      this._hasTriggered = false;
    }

    return triggered;
  }
}
