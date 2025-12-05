import { BaseAction } from './base.js';
import { SanitizationMode, ActionType } from '../types.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
// @ts-ignore
import trackingParams from '../../data/tracking_params.json' assert { type: 'json' };
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
    config: { operation: 'clear' | 'replace'; find?: string; replace?: string },
    adapter: SystemAdapter
  ) {
    super(id, ActionType.CLEAR_CLIPBOARD, config, adapter);
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
      Object.entries(trackingParams).forEach(([pattern, params]) => {
        const paramSet = new Set(params as string[]);

        if (pattern === '*') {
          // Global params
          this.globalParams = paramSet;
        } else {
          // Domain rules: *://*.instagram.com/* -> instagram.com
          // *://*.amazon.*/* -> amazon.
          let domainPart = pattern.replace('://', ''); // *://*.domain.com/* -> *.domain.com/*
          const firstDot = domainPart.indexOf('.');
          const lastSlash = domainPart.lastIndexOf('/');

          if (firstDot !== -1 && lastSlash !== -1) {
            // Extract between first dot (inclusive of dot if we want suffix?)
            // Pattern: *.instagram.com/* -> .instagram.com
            // Pattern: *.amazon.*/* -> .amazon.*

            let hostPart = domainPart.substring(firstDot + 1, lastSlash); // instagram.com or amazon.*

            if (hostPart.includes('*')) {
              // contains match (e.g. amazon.* -> amazon.)
              this.predefinedRules.push({
                type: 'contains',
                value: hostPart.replace('*', ''),
                params: paramSet,
              });
            } else {
              // suffix match
              this.predefinedRules.push({
                type: 'suffix',
                value: hostPart,
                params: paramSet,
              });
            }
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
    if (this.config.operation === 'clear') {
      this.adapter.clearClipboard();
      debugLog(`[ClipboardAction] Clipboard cleared.`);
      return;
    }

    // 2. Handle Replace & Sanitize
    if (this.config.operation === 'replace' || this.config.sanitize) {
      const content = await this.adapter.getClipboardContent();
      if (content.type === 'text' && content.content) {
        let text = content.content;
        let dirty = false;

        // A. Apply Replace
        if (
          this.config.operation === 'replace' &&
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
            try {
              const url = new URL(matchedUrl);
              let urlChanged = false;
              const currentParams = url.searchParams;

              // 1. Apply Global Params
              this.globalParams.forEach((p) => {
                if (currentParams.has(p)) {
                  currentParams.delete(p);
                  urlChanged = true;
                }
              });

              // 2. Check for Custom Match (Highest Priority after global?)
              // Actually custom rules might want to override or add to global.
              // Current logic: Global runs first. Then we check specific rules.

              let appliedCustom = false;
              // Check Custom Rules (Prefix)
              for (const rule of this.customRules) {
                if (url.href.startsWith(rule.domain)) {
                  debugLog(
                    `[ClipboardAction] Applying custom rule for ${rule.domain}`
                  );
                  rule.params.forEach((p) => {
                    if (currentParams.has(p)) {
                      currentParams.delete(p);
                      urlChanged = true;
                    }
                  });
                  appliedCustom = true;
                  break; // Apply first matching custom rule? Or all? Usually one specific rule per URL.
                  // Let's stop at first match to avoid conflict/perf issues if they overlap (e.g. domain vs domain/path)
                  // If we want "longest prefix", we should sort customRules by length descending in compile.
                  // But here we just iterate.
                }
              }

              // 3. Apply Predefined Domain Rules (if no custom rule applied? or always?)
              // Requirement: "custom will override predefined if same match".
              // Since we are matching defined domains vs suffixes, it's hard to strict "override".
              // But if a custom rule handled it, maybe we skip predefined?
              // User said "Merge" mode: "Common + Custom".
              // If I defined a custom rule for instagram.com, I probably want THAT to run.
              // If I didn't, run common.

              if (!appliedCustom) {
                const hostname = url.hostname;
                for (const rule of this.predefinedRules) {
                  let match = false;
                  if (rule.type === 'suffix') {
                    match = hostname.endsWith(rule.value);
                  } else {
                    match = hostname.includes(rule.value);
                  }

                  if (match) {
                    rule.params.forEach((p) => {
                      if (currentParams.has(p)) {
                        currentParams.delete(p);
                        urlChanged = true;
                      }
                    });
                  }
                }
              }

              if (urlChanged) {
                dirty = true;
                debugLog(`[ClipboardAction] Sanitized URL: ${url.toString()}`);
                return url.toString();
              }
            } catch (e) {
              // Not a valid URL
            }
            return matchedUrl;
          });

          text = sanitizedText;
        }

        // Commit changes if any
        if (dirty) {
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
