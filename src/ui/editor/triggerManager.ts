// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import GLib from 'gi://GLib';

import { TriggerEditorFactory } from '../components/triggerEditorFactory.js';
import { getTriggerSummary, getTriggerTitle } from '../utils/summaryHelpers.js';
import { TriggerType } from '../../engine/types.js';
import { UI_STRINGS } from '../utils/constants.js';

export class TriggerManager {
  private parentWindow: any;
  private routine: any;
  private group: any;

  constructor(parentWindow: any, routine: any) {
    this.parentWindow = parentWindow;
    this.routine = routine;
  }

  createGroup(): any {
    this.group = new Adw.PreferencesGroup({
      title: UI_STRINGS.editor.if.title,
      description: UI_STRINGS.editor.if.description,
    });
    this.refresh();
    return this.group;
  }

  private refresh() {
    // Ideally we remove all children. Adw.PreferencesGroup doesn't have remove_all.
    // We have to remove them one by one if we kept references, or just not support dynamic reordering easily.
    // BUT given we are inside the editor, it's easier to just return a container that we can clear?
    // Start fresh: We can't clear the group easily. 
    // Hack: We can use a GtkBox inside a single ActionRow? No.
    
    // Proper way: Track all added widgets.
    // Since this is a refactor, I'll stick to the logic seen in prefs.ts:
    // It seems `page.remove(group)` is possible. 
    // So the caller (Editor) should clear the group? No, that exposes implementation.
    
    // Better: `TriggerManager` manages an `Adw.PreferencesPage` content? No, it manages a specific Section.
    
    // Let's implement track-and-remove.
    // But `group.remove(child)` requires the child widget.
    // So I will just store them.
    
    if (this._children) {
        this._children.forEach(c => this.group.remove(c));
    }
    this._children = [];

    // Match Type Selector
    const matchTypeRow = new Adw.ComboRow({
      title: UI_STRINGS.editor.if.conditionLogic,
      model: new Gtk.StringList({
        strings: [UI_STRINGS.editor.if.allMet, UI_STRINGS.editor.if.anyMet],
      }),
      selected: this.routine.matchType === 'any' ? 1 : 0,
    });
    // @ts-ignore
    matchTypeRow.connect('notify::selected', () => {
      this.routine.matchType = matchTypeRow.selected === 1 ? 'any' : 'all';
    });
    this.group.add(matchTypeRow);
    this._children.push(matchTypeRow);

    // Rows
    this.routine.triggers.forEach((trigger: any, index: number) => {
      const row = new Adw.ActionRow({
        title: getTriggerTitle(trigger.type),
        subtitle: getTriggerSummary(trigger),
      });

      // Edit on click
      // @ts-ignore
      row.connect('activated', () =>
        this.editTrigger(trigger, false, () => this.refresh())
      );
      row.activatable = true;

      const deleteBtn = new Gtk.Button({
        icon_name: 'user-trash-symbolic',
        valign: Gtk.Align.CENTER,
      });
      deleteBtn.add_css_class('flat');
      // @ts-ignore
      deleteBtn.connect('clicked', () => {
        this.routine.triggers.splice(index, 1);
        this.refresh();
      });
      row.add_suffix(deleteBtn);
      
      this.group.add(row);
      this._children.push(row);
    });

    // Add Button
    const addTriggerBtn = new Gtk.Button({
      label: UI_STRINGS.editor.if.addBtn,
      margin_top: 10,
    });
    addTriggerBtn.add_css_class('pill');
    // @ts-ignore
    addTriggerBtn.connect('clicked', () => {
      const hasTime = this.routine.triggers.some(
        (tr: any) => tr.type === TriggerType.TIME
      );
      const defaultType = hasTime ? TriggerType.APP : TriggerType.TIME;

      const newTrigger = {
        id: GLib.uuid_string_random(),
        type: defaultType,
        config: {},
      };
      this.editTrigger(newTrigger, true, () => this.refresh());
    });
    this.group.add(addTriggerBtn);
    this._children.push(addTriggerBtn);
  }

  private _children: any[] = [];

  private editTrigger(trigger: any, isNew: boolean, onSave: () => void) {
      const triggerWindow = new Adw.Window({
        title: isNew ? 'Add Condition' : 'Edit Condition',
        transient_for: this.parentWindow,
        modal: true,
        width_request: 540,
        height_request: 480,
        destroy_with_parent: true,
      });

      const toolbarView = new Adw.ToolbarView();
      triggerWindow.content = toolbarView;

      const headerBar = new Adw.HeaderBar();
      toolbarView.add_top_bar(headerBar);

      const addBtn = new Gtk.Button({
        label: isNew ? UI_STRINGS.editor.add : UI_STRINGS.editor.done,
        css_classes: ['suggested-action'],
      });
      headerBar.pack_end(addBtn);

      const content = new Adw.PreferencesPage();
      toolbarView.content = content;

      const group = new Adw.PreferencesGroup();
      content.add(group);

      let tempConfig = JSON.parse(JSON.stringify(trigger.config));
      let currentType = trigger.type;

      // Use Enums for types
      const triggerTypes = [
        { id: TriggerType.STARTUP, title: UI_STRINGS.triggers.startup },
        { id: TriggerType.TIME, title: UI_STRINGS.triggers.time },
        { id: TriggerType.APP, title: UI_STRINGS.triggers.app },
        { id: TriggerType.WIFI, title: UI_STRINGS.triggers.wifi },
        { id: TriggerType.BLUETOOTH, title: UI_STRINGS.triggers.bluetooth },
        { id: TriggerType.BATTERY, title: UI_STRINGS.triggers.battery },
        { id: TriggerType.POWER_SAVER, title: UI_STRINGS.triggers.powerSaver },
        { id: TriggerType.DARK_MODE, title: UI_STRINGS.triggers.darkMode },
        {
          id: TriggerType.AIRPLANE_MODE,
          title: UI_STRINGS.triggers.airplaneMode,
        },
        { id: TriggerType.HEADPHONES, title: UI_STRINGS.triggers.headphones },
        { id: TriggerType.CLIPBOARD, title: UI_STRINGS.triggers.clipboard },
      ];

      const typeModel = new Gtk.StringList({
        strings: triggerTypes.map((t) => t.title),
      });
      const typeRow = new Adw.ComboRow({
        title: UI_STRINGS.editor.if.conditionType,
        model: typeModel,
        selected: triggerTypes.findIndex((t) => t.id === currentType),
      });
      group.add(typeRow);

      let editorGroup = new Adw.PreferencesGroup();
      content.add(editorGroup);

      const updateEditor = () => {
        content.remove(editorGroup);
        const newEditorGroup = new Adw.PreferencesGroup();
        content.add(newEditorGroup);
        editorGroup = newEditorGroup;

        const selectedType = triggerTypes[typeRow.selected].id;
        currentType = selectedType;

        const editor = TriggerEditorFactory.create(
          selectedType,
          tempConfig,
          () => {
            const isValid = editor ? editor.validate() : false;
            if (isValid === true) {
              addBtn.sensitive = true;
              addBtn.tooltip_text = '';
            } else {
              addBtn.sensitive = false;
              addBtn.tooltip_text =
                typeof isValid === 'string'
                  ? isValid
                  : UI_STRINGS.editor.errors.invalidConfig;
            }
          }
        );

        if (editor) {
          editor.render(newEditorGroup);
          const isValid = editor.validate();
          addBtn.sensitive = isValid === true;
        } else {
          const errorRow = new Adw.ActionRow({
            title: UI_STRINGS.editor.errors.noEditor,
          });
          newEditorGroup.add(errorRow);
          addBtn.sensitive = false;
        }
      };

      // @ts-ignore
      typeRow.connect('notify::selected', updateEditor);
      updateEditor();

      // @ts-ignore
      addBtn.connect('clicked', () => {
        trigger.type = currentType;
        trigger.config = tempConfig;

        if (isNew) this.routine.triggers.push(trigger);
        onSave();
        triggerWindow.close();
      });

      triggerWindow.present();
  }
}
