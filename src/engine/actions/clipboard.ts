import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class ClipboardAction extends BaseAction {
    constructor(id: string, config: { operation: 'clear' | 'replace', find?: string, replace?: string }, adapter: SystemAdapter) {
        super(id, 'clipboard', config, adapter);
    }

    async execute(): Promise<void> {
      console.log(
        `[ClipboardAction] Executing operation: ${this.config.operation}`
      );

      // 1. Handle Main Operation
      if (this.config.operation === 'clear') {
        this.adapter.clearClipboard();
        console.log(`[ClipboardAction] Clipboard cleared.`);
        return; // If cleared, no need to sanitize
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
              console.error(
                `[ClipboardAction] Invalid regex or replace failed:`,
                e
              );
            }
          }
        } else {
          console.log(
            `[ClipboardAction] Clipboard content is not text, skipping replace.`
          );
        }
      }

      // 2. Handle Sanitization (if enabled)
      if (this.config.sanitize) {
        const content = await this.adapter.getClipboardContent();
        if (content.type === 'text' && content.content) {
          try {
            const url = new URL(content.content);
            const params = new URLSearchParams(url.search);
            const mode = this.config.sanitizeConfig?.mode || 'predefined';
            const domainRules = this.config.sanitizeConfig?.domainRules || [];

            const defaultParams = [
              'utm_source',
              'utm_medium',
              'utm_campaign',
              'utm_term',
              'utm_content',
              'fbclid',
              'gclid',
              'gclsrc',
              'dclid',
              'msclkid',
              'zanpid',
              '_ga',
              '_gl',
              'mc_eid',
              'mc_cid',
            ];

            let paramsToRemove: Set<string> = new Set();

            // Apply Predefined Rules
            if (mode === 'predefined' || mode === 'merge') {
              defaultParams.forEach((p) => paramsToRemove.add(p));
            }

            // Apply Domain Rules (Custom)
            if (mode === 'custom' || mode === 'merge') {
              const hostname = url.hostname;
              domainRules.forEach(
                (rule: { pattern: string; params: string[] }) => {
                  // Simple glob matching: * -> .*
                  // Escape dots
                  let pattern = rule.pattern.replace(/\./g, '\\.');
                  // Replace * with .*
                  pattern = pattern.replace(/\*/g, '.*');
                  // Anchor
                  const regex = new RegExp(`^${pattern}$`);

                  // Check if hostname matches OR full URL matches (user might provide full url pattern)
                  // User example: *.instagram.com/*
                  // If pattern contains /, match against full URL (without protocol maybe? or with?)
                  // Let's match against hostname if no slash, or full href if slash.

                  let match = false;
                  if (rule.pattern.includes('/')) {
                    // Match against full URL (stripped of protocol for easier matching?)
                    // Or just full URL.
                    // Let's try matching against hostname + pathname
                    const urlPart = url.hostname + url.pathname;
                    if (regex.test(urlPart) || regex.test(url.href)) {
                      match = true;
                    }
                  } else {
                    if (regex.test(hostname)) {
                      match = true;
                    }
                  }

                  if (match) {
                    rule.params.forEach((p: string) => paramsToRemove.add(p));
                  }
                }
              );
            }

            let changed = false;
            paramsToRemove.forEach((p) => {
              if (params.has(p)) {
                params.delete(p);
                changed = true;
              }
            });

            // Reconstruct URL
            url.search = params.toString();

            if (changed) {
              this.adapter.setClipboardText(url.toString());
              console.log(`[ClipboardAction] Sanitized URL: ${url.toString()}`);
            } else {
              console.log(
                `[ClipboardAction] No tracking params found to remove.`
              );
            }
          } catch (e) {
            // Not a URL, skip
          }
        }
      }
    }

    revert(): void {
        // Reverting clipboard changes is complex (need history).
        // For now, no-op.
    }
}
