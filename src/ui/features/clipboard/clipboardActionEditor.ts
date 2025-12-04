// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
import { BaseEditor } from '../../components/baseEditor.js';
import { UI_STRINGS } from '../../utils/constants.js';
import { ClipboardActionConfig } from '../../../engine/types.js';

export class ClipboardActionEditor extends BaseEditor {
  protected config: ClipboardActionConfig;

  constructor(config: any, onValidationChanged: () => void) {
    super(config, onValidationChanged);
    this.config = config as ClipboardActionConfig;
    if (!this.config.operation) {
      this.config.operation = 'clear';
    }
  }

  render(group: any): void {
    // Operation Selector
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

    // Map index to operation
    const ops = ['clear', 'replace', 'none'];
    opRow.selected = ops.indexOf(this.config.operation);

    // Dynamic content group
    const contentGroup = new Adw.PreferencesGroup();

    // @ts-ignore
    opRow.connect('notify::selected', () => {
      this.config.operation = ops[opRow.selected] as any;
      this.renderContent(contentGroup);
      this.validate();
    });

    group.add(opRow);
    group.add(contentGroup);

    // Store sanitize group reference for refreshing
    (this as any)._sanitizeGroup = null;

    this.renderContent(contentGroup);
  }

  private renderContent(group: any): void {
    // Clear existing rows (hacky way since Adw.PreferencesGroup doesn't have clear())
    // We assume the group is empty or we are appending. 
    // Actually, Adw.PreferencesGroup doesn't support removing all children easily without keeping references.
    // A better approach is to remove the group from parent and add a new one, but 'group' is passed in.
    // Let's try to remove rows if we tracked them, or just use a container.
    // For simplicity in this environment, let's assume we can't easily clear 'group' passed from parent 
    // if we don't control it fully.
    // BUT, I can use a Gtk.Box inside the group? No, group expects rows.
    // Let's rely on the fact that I can remove specific rows if I track them.
    
    // Wait, I can't easily clear the group passed to renderContent if I didn't create it.
    // But I created `contentGroup` in `render`. So I can remove it from `group` (the parent) and add a new one?
    // `group` passed to `render` is the parent group.
    // `contentGroup` is added to `group`.
    // So I can't replace `contentGroup` easily inside `renderContent` without reference to `group`.
    // Let's change the structure: `render` creates `contentGroup`, adds it to `group`.
    // `renderContent` takes `contentGroup`.
    // To clear `contentGroup`, I need to remove its children.
    // Adw.PreferencesGroup inherits from Gtk.Widget -> GObject.
    // It has `remove(child)`.
    
    // Let's track children.
    if ((this as any)._rows) {
      (this as any)._rows.forEach((row: any) => group.remove(row));
    }
    (this as any)._rows = [];

    if (this.config.operation === 'replace') {
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

    // Sanitize Section
    if (this.config.operation !== 'clear') {
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
    // Remove existing config rows (hacky tracking)
    if ((this as any)._sanitizeRows) {
      (this as any)._sanitizeRows.forEach((row: any) => group.remove(row));
    }
    (this as any)._sanitizeRows = [];

    if (!visible) return;

    if (!this.config.sanitizeConfig) {
      this.config.sanitizeConfig = { mode: 'predefined', domainRules: [] };
    }

    // Mode Selector
    const modeModel = new Gtk.StringList({
      strings: [
        UI_STRINGS.clipboard.modes.predefined,
        UI_STRINGS.clipboard.modes.merge,
        UI_STRINGS.clipboard.modes.custom,
      ],
    });
    const modeRow = new Adw.ComboRow({
      title: UI_STRINGS.clipboard.sanitizeMode,
      model: modeModel,
    });
    
    const modes = ['predefined', 'merge', 'custom'];
    modeRow.selected = modes.indexOf(this.config.sanitizeConfig.mode);

    // @ts-ignore
    modeRow.connect('notify::selected', () => {
      this.config.sanitizeConfig!.mode = modes[modeRow.selected] as any;
    });
    group.add(modeRow);
    (this as any)._sanitizeRows.push(modeRow);

    // Domain Rules Header/Group
    // Since we are inside a PreferencesGroup, we can't add another Group.
    // We'll just add rows.
    
    const rulesHeader = new Adw.ActionRow({
      title: UI_STRINGS.clipboard.domainRules,
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

    // List Rules
    const rules = this.config.sanitizeConfig.domainRules || [];
    if (rules.length === 0) {
      const noRulesRow = new Adw.ActionRow({
        title: UI_STRINGS.clipboard.noRules,
        css_classes: ['dim-label'],
      });
      group.add(noRulesRow);
      (this as any)._sanitizeRows.push(noRulesRow);
    } else {
      rules.forEach((rule, index) => {
        const row = new Adw.ActionRow({
          title: rule.pattern,
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

  private editRule(index?: number): void {
    // We need a way to show a dialog. 
    // Since we don't have easy access to the nav view here directly (it's in RoutineEditor),
    // we might need to use a modal dialog or ask the factory to handle it?
    // BaseEditor doesn't have reference to NavView.
    // But we can create a Gtk.Window or Adw.Window (modal) attached to the current root?
    // Or just use a simple dialog if possible.
    // Let's try creating a transient Adw.Window.
    
    const isNew = index === undefined;
    const rule = isNew ? { pattern: '', params: [] as string[] } : this.config.sanitizeConfig!.domainRules![index!];
    
    const win = new Adw.Window({
      title: isNew ? UI_STRINGS.clipboard.addRuleTitle : UI_STRINGS.clipboard.editRule,
      modal: true,
      default_width: 400,
      default_height: 300,
      // transient_for: ... we don't have the parent window easily. 
      // It might work without transient_for but won't be modal to the parent properly.
      // However, for this environment, it's acceptable.
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
      sensitive: false
    });
    header.pack_end(saveBtn);
    
    win.content = toolbar;

    // Fields
    const domainEntry = new Adw.EntryRow({
      title: UI_STRINGS.clipboard.ruleDomain,
      text: rule.pattern,
    });
    group.add(domainEntry);

    const paramsEntry = new Adw.EntryRow({
      title: UI_STRINGS.clipboard.ruleParams,
      text: rule.params.join(', '),
    });
    group.add(paramsEntry);

    const validate = () => {
      saveBtn.sensitive = domainEntry.text.length > 0 && paramsEntry.text.length > 0;
    };

    // @ts-ignore
    domainEntry.connect('changed', validate);
    // @ts-ignore
    paramsEntry.connect('changed', validate);

    // @ts-ignore
    saveBtn.connect('clicked', () => {
      const newRule = {
        pattern: domainEntry.text,
        params: paramsEntry.text.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
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
      // We need to find the group to refresh. 
      // renderSanitizeConfig needs 'group'.
      // We don't have 'group' stored.
      // We should store 'sanitizeGroup' in the class instance.
      if ((this as any)._sanitizeGroup) {
        this.renderSanitizeConfig((this as any)._sanitizeGroup, true);
      }
      
      win.close();
    });

    win.present();
  }

  validate(): boolean | string {
    if (this.config.operation === 'replace') {
      if (!this.config.find) return 'Find pattern is required';
    }
    return true;
  }
}
