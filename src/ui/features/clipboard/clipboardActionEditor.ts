// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import GLib from 'gi://GLib';
import { BaseEditor } from '../../components/baseEditor.js';
import { UI_STRINGS } from '../../utils/constants.js';
import {
  ClipboardActionConfig,
  SanitizationMode,
  ClipboardOperation,
} from '../../../engine/types.js';
import debugLog from '../../../utils/log.js';

export class ClipboardActionEditor extends BaseEditor {
  protected config: ClipboardActionConfig;

  constructor(config: any, onValidationChanged: () => void) {
    super(config, onValidationChanged);
    this.config = config as ClipboardActionConfig;
    if (!this.config.operation) {
      this.config.operation = ClipboardOperation.CLEAR;
    }
  }

  render(group: any): void {
    // Operation
    const opModel = new Gtk.StringList({
      strings: [
        UI_STRINGS.clipboard.clear,
        UI_STRINGS.clipboard.replaceWith,
        UI_STRINGS.clipboard.none,
      ],
    });

    const opRow = new Adw.ComboRow({
      title: UI_STRINGS.clipboard.operation,
      model: opModel,
    });

    // Valid ops
    const ops = [
      ClipboardOperation.CLEAR,
      ClipboardOperation.REPLACE,
      ClipboardOperation.NONE,
    ];
    opRow.selected = ops.indexOf(this.config.operation);

    // Content group
    const contentGroup = new Adw.PreferencesGroup();

    // @ts-ignore
    opRow.connect('notify::selected', () => {
      this.config.operation = ops[opRow.selected] as ClipboardOperation;
      this.renderContent(contentGroup);
      this.validate();
    });

    group.add(opRow);
    group.add(contentGroup);

    // Sanitize group ref
    (this as any)._sanitizeGroup = null;

    this.renderContent(contentGroup);
  }

  private renderContent(group: any): void {
    // Refresh rows
    if ((this as any)._rows) {
      (this as any)._rows.forEach((row: any) => group.remove(row));
    }
    (this as any)._rows = [];

    if (this.config.operation === ClipboardOperation.REPLACE) {
      const findRow = new Adw.EntryRow({
        title: UI_STRINGS.clipboard.find,
        text: this.config.find || '',
      });
      // @ts-ignore
      findRow.connect('changed', () => {
        this.config.find = findRow.text;
        this.validate();
      });
      group.add(findRow);
      (this as any)._rows.push(findRow);

      const replaceRow = new Adw.EntryRow({
        title: UI_STRINGS.clipboard.replaceWith,
        text: this.config.replace || '',
      });
      // @ts-ignore
      replaceRow.connect('changed', () => {
        this.config.replace = replaceRow.text;
        this.validate();
      });
      group.add(replaceRow);
      (this as any)._rows.push(replaceRow);
    }

    // Sanitize
    if (this.config.operation !== ClipboardOperation.CLEAR) {
      const sanitizeGroup = new Adw.PreferencesGroup({
        title: UI_STRINGS.clipboard.sanitize,
      });
      group.add(sanitizeGroup);
      (this as any)._sanitizeGroup = sanitizeGroup;
      (this as any)._rows.push(sanitizeGroup);

      const sanitizeSwitch = new Adw.SwitchRow({
        title: UI_STRINGS.clipboard.sanitize,
        subtitle: UI_STRINGS.clipboard.sanitizeDescription,
        active: this.config.sanitize || false,
      });
      // @ts-ignore
      sanitizeSwitch.connect('notify::active', () => {
        this.config.sanitize = sanitizeSwitch.active;
        this.renderSanitizeConfig(sanitizeGroup, sanitizeSwitch.active);
      });
      sanitizeGroup.add(sanitizeSwitch);

      this.renderSanitizeConfig(sanitizeGroup, this.config.sanitize || false);
    }
  }

  private renderSanitizeConfig(group: any, visible: boolean): void {
    // Refresh config rows
    if ((this as any)._sanitizeRows) {
      (this as any)._sanitizeRows.forEach((row: any) => group.remove(row));
    }
    (this as any)._sanitizeRows = [];

    if (!visible) return;

    if (!this.config.sanitizeConfig) {
      this.config.sanitizeConfig = {
        mode: SanitizationMode.PREDEFINED,
        domainRules: [],
      };
    }

    // Mode
    const modeModel = new Gtk.StringList({
      strings: [
        UI_STRINGS.clipboard.modes.predefined,
        UI_STRINGS.clipboard.modes.merge,
        UI_STRINGS.clipboard.modes.custom,
      ],
    });
    const modeRow = new Adw.ComboRow({
      title: UI_STRINGS.clipboard.sanitizeConfig,
      model: modeModel,
    });

    const modes = [
      SanitizationMode.PREDEFINED,
      SanitizationMode.MERGE,
      SanitizationMode.CUSTOM,
    ];
    modeRow.selected = modes.indexOf(this.config.sanitizeConfig.mode);

    // @ts-ignore
    modeRow.connect('notify::selected', () => {
      if (this.config.sanitizeConfig) {
        this.config.sanitizeConfig.mode = modes[
          modeRow.selected
        ] as SanitizationMode;
        // Re-render to show/hide rules
        this.renderSanitizeConfig(group, true);
      }
    });
    group.add(modeRow);
    (this as any)._sanitizeRows.push(modeRow);

    // Custom Rules
    if (this.config.sanitizeConfig.mode !== SanitizationMode.PREDEFINED) {
      const rulesHeader = new Adw.ActionRow({
        title: UI_STRINGS.clipboard.customParams,
      });
      const addRuleBtn = new Gtk.Button({
        icon_name: 'list-add-symbolic',
        valign: Gtk.Align.CENTER,
        css_classes: ['flat'],
      });
      // @ts-ignore
      addRuleBtn.connect('clicked', () => this.editRule());
      rulesHeader.add_suffix(addRuleBtn);

      group.add(rulesHeader);
      (this as any)._sanitizeRows.push(rulesHeader);

      // Rule List
      const rules = this.config.sanitizeConfig.domainRules || [];
      if (rules.length === 0) {
        const noRulesRow = new Adw.ActionRow({
          title: UI_STRINGS.clipboard.noParams,
          css_classes: ['dim-label'],
        });
        group.add(noRulesRow);
        (this as any)._sanitizeRows.push(noRulesRow);
      } else {
        rules.forEach((rule, index) => {
          const row = new Adw.ActionRow({
            title: rule.domain,
            subtitle: rule.params.join(', '),
          });

          // Edit
          // @ts-ignore
          row.connect('activated', () => this.editRule(index));
          row.activatable = true;

          // Delete
          const delBtn = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
          });
          // @ts-ignore
          delBtn.connect('clicked', () => {
            this.config.sanitizeConfig!.domainRules!.splice(index, 1);
            // Re-render
            this.renderSanitizeConfig(group, true);
          });
          row.add_suffix(delBtn);

          group.add(row);
          (this as any)._sanitizeRows.push(row);
        });
      }
    }
  }

  private editRule(index?: number): void {
    const isNew = index === undefined;
    const rule = isNew
      ? { domain: '', params: [] as string[] }
      : this.config.sanitizeConfig!.domainRules![index!];

    const win = new Adw.Window({
      title: isNew
        ? UI_STRINGS.clipboard.addParamTitle
        : UI_STRINGS.clipboard.editParam,
      modal: true,
      default_width: 450,
      default_height: 350,
    });

    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup();
    page.add(group);

    const toolbar = new Adw.ToolbarView();
    toolbar.content = page;

    const header = new Adw.HeaderBar();
    toolbar.add_top_bar(header);

    const cancelBtn = new Gtk.Button({ label: UI_STRINGS.editor.cancel });
    // @ts-ignore
    cancelBtn.connect('clicked', () => win.close());
    header.pack_start(cancelBtn);

    const saveBtn = new Gtk.Button({
      label: isNew ? UI_STRINGS.editor.add : UI_STRINGS.editor.done,
      css_classes: ['suggested-action'],
      sensitive: false,
    });
    header.pack_end(saveBtn);

    win.content = toolbar;

    // Fields
    const domainEntry = new Adw.EntryRow({
      title: `${UI_STRINGS.clipboard.paramDomain} (e.g. ${UI_STRINGS.clipboard.paramDomainPlaceholder})`,
      text: rule.domain,
    });
    domainEntry.tooltip_text = UI_STRINGS.clipboard.paramDomainPlaceholder;
    group.add(domainEntry);

    const paramsEntry = new Adw.EntryRow({
      title: `${UI_STRINGS.clipboard.paramsToRemove} (e.g. ${UI_STRINGS.clipboard.paramsToRemovePlaceholder})`,
      text: rule.params.join(', '),
    });
    paramsEntry.tooltip_text = UI_STRINGS.clipboard.paramsToRemovePlaceholder;
    group.add(paramsEntry);

    // Domain Utils
    const normalizeDomain = (input: string): string | null => {
      let domainInput = input.trim();
      if (
        domainInput.length > 0 &&
        !domainInput.startsWith('http://') &&
        !domainInput.startsWith('https://')
      ) {
        domainInput = 'https://' + domainInput;
      }

      try {
        const uri = GLib.Uri.parse(domainInput, GLib.UriFlags.NONE);
        const host = uri.get_host();
        if (!host) return null;

        if (domainInput.includes(' ')) return null;

        const domainRegex =
          /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
        if (!domainRegex.test(host)) return null;

        if (host.split('.').pop()!.length < 2) return null;

        let path = uri.get_path();
        if (!path || path === '') {
          path = '/';
        }

        path = path.replace(/\/+/g, '/');

        if (path.length > 1 && path.endsWith('/')) {
          path = path.slice(0, -1);
        }

        const scheme = uri.get_scheme();
        let normalized = `${scheme}://${host}${path}`;

        const query = uri.get_query();
        if (query) {
          normalized += `?${query}`;
        }
        return normalized;
      } catch (e) {
        return null;
      }
    };

    const validate = () => {
      debugLog('[VALIDATE] validate on clipboard action editor');
      const normalizedDomain = normalizeDomain(domainEntry.text);
      const isValidUrl = normalizedDomain !== null;

      debugLog(
        `[VALIDATE] isValidUrl: ${isValidUrl}, normalizedDomain: ${normalizedDomain}`
      );

      // Check if domain already exists
      const exists = this.config.sanitizeConfig!.domainRules!.some((r, i) => {
        if (!isNew && i === index) return false; // Ignore self when editing

        // Normalize rule
        const existingNormalized = normalizeDomain(r.domain);
        // Fallback
        return (
          (existingNormalized && existingNormalized === normalizedDomain) ||
          r.domain === domainEntry.text
        );
      });

      debugLog(
        `[VALIDATE] exists: ${exists}, paramsEntry.text.length: ${paramsEntry.text.length}`
      );

      // Validation
      saveBtn.sensitive = isValidUrl && paramsEntry.text.length > 0 && !exists;

      if (!isValidUrl && domainEntry.text.length > 0) {
        domainEntry.add_css_class('error');
        domainEntry.tooltip_text = 'Invalid URL';
      } else if (exists) {
        domainEntry.add_css_class('error');
        domainEntry.tooltip_text = 'Domain rule already exists';
      } else {
        domainEntry.remove_css_class('error');
        domainEntry.tooltip_text = UI_STRINGS.clipboard.paramDomainPlaceholder;
      }
    };

    // @ts-ignore
    domainEntry.connect('changed', validate);
    // @ts-ignore
    paramsEntry.connect('changed', validate);

    // @ts-ignore
    saveBtn.connect('clicked', () => {
      const normalizedDomain = normalizeDomain(domainEntry.text);

      if (normalizedDomain) {
        const newRule = {
          domain: normalizedDomain,
          params: paramsEntry.text
            .split(/[\s,]+/)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0),
        };

        if (!this.config.sanitizeConfig!.domainRules) {
          this.config.sanitizeConfig!.domainRules = [];
        }

        if (isNew) {
          this.config.sanitizeConfig!.domainRules!.push(newRule);
        } else {
          this.config.sanitizeConfig!.domainRules![index!] = newRule;
        }

        // Refresh parent UI
        if ((this as any)._sanitizeGroup) {
          this.renderSanitizeConfig((this as any)._sanitizeGroup, true);
        }

        win.close();
      }
    });

    win.present();
  }

  validate(): boolean | string {
    if (this.config.operation === ClipboardOperation.REPLACE) {
      if (!this.config.find) return 'Find pattern is required';
    }
    return true;
  }
}
