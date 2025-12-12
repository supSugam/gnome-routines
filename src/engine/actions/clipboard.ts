// @ts-ignore
import GLib from 'gi://GLib';
import { BaseAction } from './base.js';
import { SanitizationMode, ActionType, ClipboardOperation } from '../types.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
// @ts-ignore
import { trackingParams } from '../../data/trackingParams.js';
import debugLog from '../../utils/log.js';

export class ClipboardAction extends BaseAction {
  private predefinedRules: {
    type: 'suffix' | 'contains';
    value: string;
    params: Set<string>;
  }[] = [];
  private globalParams: Set<string> = new Set();
  private customRules: { domain: string; params: Set<string> }[] = [];
  private rulesCompiled: boolean = false;

  constructor(
    id: string,
    config: {
      operation: ClipboardOperation;
      find?: string;
      replace?: string;
    },
    adapter: SystemAdapter
  ) {
    super(id, ActionType.CLIPBOARD, config, adapter);
  }

  private compileRules() {
    const mode =
      this.config.sanitizeConfig?.mode || SanitizationMode.PREDEFINED;
    const customRulesConfig = this.config.sanitizeConfig?.domainRules || [];

    // Reset
    this.predefinedRules = [];
    this.globalParams = new Set();
    this.customRules = [];

    // 1. Load Predefined
    if (
      mode === SanitizationMode.PREDEFINED ||
      mode === SanitizationMode.MERGE
    ) {
      Object.entries(trackingParams).forEach(([key, params]) => {
        const paramSet = new Set(params as string[]);

        if (key === 'global') {
          // Global params
          this.globalParams = paramSet;
        } else {
          // Simplified logic: simple suffix/substring check
          // key is 'instagram.com', 'amazon.', etc.
          if (key.endsWith('.')) {
            // 'amazon.' -> contains check
            this.predefinedRules.push({
              type: 'contains',
              value: key,
              params: paramSet,
            });
          } else {
            // 'instagram.com' -> suffix check
            this.predefinedRules.push({
              type: 'suffix',
              value: key,
              params: paramSet,
            });
          }
        }
      });
    }

    // 2. Load Custom (Prefix based)
    if (mode === SanitizationMode.CUSTOM || mode === SanitizationMode.MERGE) {
      customRulesConfig.forEach(
        (rule: { domain: string; params: string[] }) => {
          this.customRules.push({
            domain: rule.domain,
            params: new Set(rule.params),
          });
        }
      );
    }

    this.rulesCompiled = true;
    debugLog(
      `[ClipboardAction] Compiled rules: ${this.globalParams.size} global, ${this.predefinedRules.length} predefined, ${this.customRules.length} custom.`
    );
  }

  async execute(): Promise<void> {
    debugLog(`[ClipboardAction] Executing operation: ${this.config.operation}`);

    // 1. Handle Clear Operation
    if (this.config.operation === ClipboardOperation.CLEAR) {
      this.adapter.clearClipboard();
      debugLog(`[ClipboardAction] Clipboard cleared.`);
      return;
    }

    // 2. Handle Replace & Sanitize
    if (
      this.config.operation === ClipboardOperation.REPLACE ||
      this.config.sanitize
    ) {
      const content = await this.adapter.getClipboardContent();
      debugLog(`[ClipboardAction] Current clipboard type: ${content.type}`);
      if (content.type === 'text' && content.content) {
        let text = content.content;
        debugLog(`[ClipboardAction] Content length: ${text.length}`);
        let dirty = false;

        // A. Apply Replace
        if (
          this.config.operation === ClipboardOperation.REPLACE &&
          this.config.find &&
          this.config.replace !== undefined
        ) {
          try {
            const regex = new RegExp(this.config.find, 'g');
            const replaced = text.replace(regex, this.config.replace);
            if (replaced !== text) {
              text = replaced;
              dirty = true;
              debugLog(`[ClipboardAction] Text replacement applied.`);
            }
          } catch (e) {
            console.error(`[ClipboardAction] Replace regex error:`, e);
          }
        }

        // B. Apply Sanitization
        if (this.config.sanitize) {
          if (!this.rulesCompiled) this.compileRules();

          // Robust URL Regex to find URLs in text
          const urlRegex =
            /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

          const sanitizedText = text.replace(urlRegex, (matchedUrl) => {
            debugLog(`[ClipboardAction] Found URL candidate: ${matchedUrl}`);
            try {
              // Parse URI using GLib
              const uri = GLib.Uri.parse(matchedUrl, GLib.UriFlags.NONE);
              const hostname = uri.get_host();
              const query = uri.get_query(); // Returns raw query string or null

              debugLog(`[ClipboardAction] Parsing hostname: ${hostname}`);

              if (!query) {
                debugLog(`[ClipboardAction] No query params found.`);
                return matchedUrl;
              }

              // Parse Query Params Manually
              // We want to preserve specific encoding for values, so we work with raw pairs
              const rawPairs = query.split('&');
              const keptPairs: string[] = [];
              let urlChanged = false;
              let currentParamsKeys: Set<string> = new Set();

              const parsedPairs = rawPairs.map((pair: string) => {
                const parts = pair.split('=');
                const rawKey = parts[0];
                // Decode key for matching (safe for standard params)
                let decodedKey = rawKey;
                try {
                  decodedKey = decodeURIComponent(rawKey);
                } catch (e) {}

                currentParamsKeys.add(decodedKey);
                return { raw: pair, key: decodedKey };
              });

              debugLog(
                `[ClipboardAction] Current Params: ${Array.from(
                  currentParamsKeys
                ).join(', ')}`
              );

              // Filter Params
              parsedPairs.forEach((pair: { raw: string; key: string }) => {
                const p = pair.key;
                let remove = false;

                // 1. Global
                if (this.globalParams.has(p)) {
                  debugLog(`[ClipboardAction] Found global param: ${p}`);
                  remove = true;
                }

                // 2. Custom
                if (!remove) {
                  for (const rule of this.customRules) {
                    // Use matchedUrl logic for prefix?
                    // uri.to_string() gives full URI.
                    // matchedUrl is the string we found.
                    if (matchedUrl.startsWith(rule.domain)) {
                      if (rule.params.has(p)) {
                        debugLog(
                          `[ClipboardAction] Removing custom param: ${p}`
                        );
                        remove = true;
                        break;
                      }
                    }
                  }
                }

                // 3. Predefined
                if (!remove) {
                  // Check if any predefined rules apply to this hostname
                  for (const rule of this.predefinedRules) {
                    let match = false;
                    if (rule.type === 'suffix') {
                      // Suffix match
                      match =
                        hostname === rule.value ||
                        hostname.endsWith('.' + rule.value);
                    } else {
                      // Contains match
                      match = hostname.includes(rule.value);
                    }

                    if (match && rule.params.has(p)) {
                      debugLog(
                        `[ClipboardAction] Removing predefined param: ${p} (Rule: ${rule.value})`
                      );
                      remove = true;
                      break;
                    }
                  }
                }

                if (remove) {
                  urlChanged = true;
                } else {
                  keptPairs.push(pair.raw);
                }
              });

              if (urlChanged) {
                // Rebuild URI
                const newQuery = keptPairs.join('&');
                const newUri = GLib.Uri.build(
                  GLib.UriFlags.NONE,
                  uri.get_scheme(),
                  uri.get_userinfo(),
                  uri.get_host(),
                  uri.get_port(),
                  uri.get_path(),
                  newQuery || null, // Pass null if empty
                  uri.get_fragment()
                );

                const finalUrl = newUri.to_string();
                debugLog(`[ClipboardAction] Sanitized URL: ${finalUrl}`);
                return finalUrl;
              }
            } catch (e) {
              debugLog(`[ClipboardAction] URL parse error (GLib): ${e}`);
            }
            return matchedUrl;
          });

          text = sanitizedText;
        }

        // Commit changes if any
        if (dirty || (this.config.sanitize && text !== content.content)) {
          this.adapter.setClipboardText(text);
          debugLog(`[ClipboardAction] Clipboard updated.`);
        } else {
          debugLog(`[ClipboardAction] No changes needed.`);
        }
      } else {
        debugLog(`[ClipboardAction] Clipboard content is not text, skipping.`);
      }
    }
  }

  revert(): void {
    // Reverting clipboard changes is complex (need history).
    // For now, no-op.
  }
}
