// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import GObject from 'gi://GObject';
// @ts-ignore
import GLib from 'gi://GLib';
// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import NM from 'gi://NM';
import { TriggerEditorFactory } from './components/triggerEditorFactory.js';
import { ActionEditorFactory } from './components/actionEditorFactory.js';
import { getTriggerSummary, getActionSummary } from './utils/summaryHelpers.js';
import { TriggerType, ActionType } from '../engine/types.js';
import { UI_STRINGS } from './utils/constants.js';

export class RoutineEditor {
  private routine: any;
  private onSave: (routine: any) => void;
  private window: any;

  constructor(routine: any | null, onSave: (routine: any) => void) {
    this.routine = routine || {
      id: GLib.uuid_string_random(),
      name: 'New Routine',
      enabled: true,
      triggers: [],
      actions: [],
    };
    this.onSave = onSave;
  }

  show(parentWindow: any) {
    const winConfig: any = {
      title: this.routine.name,
      modal: true,
      default_width: 600,
      default_height: 500,
    };
    if (parentWindow) {
      winConfig.transient_for = parentWindow;
    }

    this.window = new Adw.Window(winConfig);

    // Main Navigation View
    const navView = new Adw.NavigationView();
    this.window.content = navView;

    // Main Page (Routine List)
    const mainPage = new Adw.NavigationPage({
      title: UI_STRINGS.editor.title,
      tag: 'main',
    });
    navView.add(mainPage);

    const toolbarView = new Adw.ToolbarView();
    mainPage.child = toolbarView;

    const headerBar = new Adw.HeaderBar();
    toolbarView.add_top_bar(headerBar);

    const saveBtn = new Gtk.Button({
      label: UI_STRINGS.editor.save,
      css_classes: ['suggested-action'],
    });
    // @ts-ignore
    saveBtn.connect('clicked', () => {
      console.log('[Editor] Save clicked');
      // Update name from entry
      this.routine.name = nameEntry.text;

      if (!this.routine.name) {
        console.log('[Editor] Name is empty');
        // TODO: Show error
        return;
      }
      try {
        console.log('[Editor] Calling onSave', JSON.stringify(this.routine));
        this.onSave(this.routine);
        console.log('[Editor] onSave completed');
        this.window.close();
      } catch (e) {
        console.error('[Editor] Save failed', e);
      }
    });
    headerBar.pack_end(saveBtn);

    const content = new Adw.PreferencesPage();
    toolbarView.content = content;

    const group = new Adw.PreferencesGroup({
      title: UI_STRINGS.editor.general,
    });
    content.add(group);

    const nameEntry = new Adw.EntryRow({
      title: UI_STRINGS.editor.name,
      text: this.routine.name,
    });
    group.add(nameEntry);

    // If Section (Triggers)
    const triggerGroup = new Adw.PreferencesGroup({
      title: UI_STRINGS.editor.if.title,
      description: UI_STRINGS.editor.if.description,
    });
    content.add(triggerGroup);

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
    triggerGroup.add(matchTypeRow);

    const editTrigger = (trigger: any, isNew: boolean = false) => {
      const page = new Adw.NavigationPage({
        title: isNew ? 'Add Condition' : 'Edit Condition',
        tag: 'edit-trigger',
      });

      const toolbarView = new Adw.ToolbarView();
      page.child = toolbarView;

      const headerBar = new Adw.HeaderBar();
      toolbarView.add_top_bar(headerBar);

      const cancelBtn = new Gtk.Button({ label: UI_STRINGS.editor.cancel });
      // @ts-ignore
      cancelBtn.connect('clicked', () => navView.pop());
      headerBar.pack_start(cancelBtn);

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

      // Container for dynamic editor content
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
            // Validation callback
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
          // Initial validation
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
        refreshTriggers();
        navView.pop();
      });

      navView.push(page);
    };

    // Track added rows to remove them cleanly
    let triggerRows: any[] = [];

    const refreshTriggers = () => {
      // Remove previously added rows
      triggerRows.forEach((row) => triggerGroup.remove(row));
      triggerRows = [];

      this.routine.triggers.forEach((trigger: any, index: number) => {
        const row = new Adw.ActionRow({
          title: trigger.type,
          subtitle: getTriggerSummary(trigger),
        });

        // Edit on click
        // @ts-ignore
        row.connect('activated', () => editTrigger(trigger));
        row.activatable = true;

        const deleteBtn = new Gtk.Button({
          icon_name: 'user-trash-symbolic',
          valign: Gtk.Align.CENTER,
        });
        deleteBtn.add_css_class('flat');
        // @ts-ignore
        deleteBtn.connect('clicked', () => {
          this.routine.triggers.splice(index, 1);
          refreshTriggers();
        });
        row.add_suffix(deleteBtn);
        triggerGroup.add(row);
        triggerRows.push(row);
      });
    };

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
      editTrigger(newTrigger, true);
    });
    triggerGroup.add(addTriggerBtn);
    refreshTriggers();

    // Then Section (Actions)
    const actionGroup = new Adw.PreferencesGroup({
      title: UI_STRINGS.editor.then.title,
      description: UI_STRINGS.editor.then.description,
    });
    content.add(actionGroup);

    const editAction = (
      action: any,
      isNew: boolean = false,
      customOnSave: ((config: any) => void) | null = null
    ) => {
      const page = new Adw.NavigationPage({
        title: isNew ? 'Add Action' : 'Edit Action',
        tag: 'edit-action',
      });

      const toolbarView = new Adw.ToolbarView();
      page.child = toolbarView;

      const headerBar = new Adw.HeaderBar();
      toolbarView.add_top_bar(headerBar);

      const cancelBtn = new Gtk.Button({ label: UI_STRINGS.editor.cancel });
      // @ts-ignore
      cancelBtn.connect('clicked', () => navView.pop());
      headerBar.pack_start(cancelBtn);

      const addBtn = new Gtk.Button({
        label: isNew ? UI_STRINGS.editor.add : UI_STRINGS.editor.done,
        css_classes: ['suggested-action'],
      });
      headerBar.pack_end(addBtn);

      const content = new Adw.PreferencesPage();
      toolbarView.content = content;

      const group = new Adw.PreferencesGroup();
      content.add(group);

      let tempConfig = JSON.parse(JSON.stringify(action.config));
      let currentType = action.type;

      const actionTypes = [
        { id: ActionType.OPEN_APP, title: UI_STRINGS.actions.openApp },
        { id: ActionType.WIFI, title: UI_STRINGS.actions.wifi },
        { id: ActionType.CONNECT_WIFI, title: UI_STRINGS.actions.connectWifi },
        { id: ActionType.BLUETOOTH, title: UI_STRINGS.actions.bluetooth },
        {
          id: ActionType.CONNECT_BLUETOOTH,
          title: UI_STRINGS.actions.connectBluetooth,
        },
        {
          id: ActionType.DISCONNECT_BLUETOOTH,
          title: UI_STRINGS.actions.disconnectBluetooth,
        },
        { id: ActionType.DND, title: UI_STRINGS.actions.dnd },
        {
          id: ActionType.AIRPLANE_MODE,
          title: UI_STRINGS.actions.airplaneMode,
        },
        { id: ActionType.VOLUME, title: UI_STRINGS.actions.volume },
        { id: ActionType.BRIGHTNESS, title: UI_STRINGS.actions.brightness },
        {
          id: ActionType.KEYBOARD_BRIGHTNESS,
          title: UI_STRINGS.actions.keyboardBrightness,
        },
        { id: ActionType.WALLPAPER, title: UI_STRINGS.actions.wallpaper },
        { id: ActionType.DARK_MODE, title: UI_STRINGS.actions.darkMode },
        { id: ActionType.NIGHT_LIGHT, title: UI_STRINGS.actions.nightLight },
        { id: ActionType.POWER_SAVER, title: UI_STRINGS.actions.powerSaver },
        {
          id: ActionType.SCREEN_TIMEOUT,
          title: UI_STRINGS.actions.screenTimeout,
        },
        {
          id: ActionType.SCREEN_ORIENTATION,
          title: UI_STRINGS.actions.screenOrientation,
        },
        {
          id: ActionType.TAKE_SCREENSHOT,
          title: UI_STRINGS.actions.takeScreenshot,
        },
        { id: ActionType.NOTIFICATION, title: UI_STRINGS.actions.notification },
        {
          id: ActionType.CLEAR_CLIPBOARD,
          title: UI_STRINGS.actions.clearClipboard,
        },
        { id: ActionType.OPEN_LINK, title: UI_STRINGS.actions.openLink },
      ];

      const typeModel = new Gtk.StringList({
        strings: actionTypes.map((t) => t.title),
      });
      const typeRow = new Adw.ComboRow({
        title: UI_STRINGS.editor.then.actionType,
        model: typeModel,
        selected: actionTypes.findIndex((t) => t.id === currentType),
        visible: !customOnSave,
      });
      group.add(typeRow);

      let editorGroup = new Adw.PreferencesGroup();
      content.add(editorGroup);

      const updateEditor = () => {
        content.remove(editorGroup);
        const newEditorGroup = new Adw.PreferencesGroup();
        content.add(newEditorGroup);
        editorGroup = newEditorGroup;

        const selectedType = actionTypes[typeRow.selected].id;
        currentType = selectedType;

        const editor = ActionEditorFactory.create(
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
        if (customOnSave) {
          customOnSave(tempConfig);
        } else {
          action.type = currentType;
          action.config = tempConfig;
          if (isNew) this.routine.actions.push(action);
          refreshActions();
        }
        navView.pop();
      });

      navView.push(page);
    };

    // Track added action rows
    let actionRows: any[] = [];

    const refreshActions = () => {
      actionRows.forEach((row) => actionGroup.remove(row));
      actionRows = [];

      this.routine.actions.forEach((action: any, index: number) => {
        const row = new Adw.ActionRow({
          title: action.type,
          subtitle: getActionSummary(action),
        });

        // Edit on click
        // @ts-ignore
        row.connect('activated', () => editAction(action));
        row.activatable = true;

        const deleteBtn = new Gtk.Button({
          icon_name: 'user-trash-symbolic',
          valign: Gtk.Align.CENTER,
        });
        deleteBtn.add_css_class('flat');
        // @ts-ignore
        deleteBtn.connect('clicked', () => {
          this.routine.actions.splice(index, 1);
          refreshActions();
        });
        row.add_suffix(deleteBtn);
        actionGroup.add(row);
        actionRows.push(row);
      });

      refreshEndActions();
    };

    const addActionBtn = new Gtk.Button({
      label: UI_STRINGS.editor.then.addBtn,
      margin_top: 10,
    });
    addActionBtn.add_css_class('pill');
    // @ts-ignore
    addActionBtn.connect('clicked', () => {
      const hasDnd = this.routine.actions.some(
        (ac: any) => ac.type === ActionType.DND
      );
      const defaultType = hasDnd ? ActionType.WALLPAPER : ActionType.DND;

      const newAction = {
        id: GLib.uuid_string_random(),
        type: defaultType,
        config: {},
      };
      editAction(newAction, true);
    });
    actionGroup.add(addActionBtn);

    // When Routine Ends Section
    const endGroup = new Adw.PreferencesGroup({
      title: UI_STRINGS.editor.end.title,
      description: UI_STRINGS.editor.end.description,
    });
    content.add(endGroup);

    let endRows: any[] = [];

    const refreshEndActions = () => {
      endRows.forEach((row) => endGroup.remove(row));
      endRows = [];

      this.routine.actions.forEach((action: any) => {
        const getEndSummary = () => {
          const type = action.onDeactivate?.type || 'revert';
          if (type === 'revert') return UI_STRINGS.editor.end.revert;
          if (type === 'keep') return UI_STRINGS.editor.end.keep;
          if (type === 'custom') {
            if (action.onDeactivate?.config) {
              // Create a dummy action to generate summary
              const dummy = { ...action, config: action.onDeactivate.config };
              return `${UI_STRINGS.editor.end.customPrefix}${getActionSummary(
                dummy
              )}`;
            }
            return UI_STRINGS.editor.end.custom;
          }
          return '';
        };

        const row = new Adw.ActionRow({
          title: getActionSummary(action), // Show main action as title
          subtitle: getEndSummary(),
        });

        // Dropdown for behavior
        const model = new Gtk.StringList({
          strings: UI_STRINGS.editor.end.behaviors,
        });
        const combo = new Gtk.DropDown({
          model: model,
          valign: Gtk.Align.CENTER,
        });

        // Set initial selection
        const currentType = action.onDeactivate?.type || 'revert';
        if (currentType === 'keep') combo.selected = 1;
        else if (currentType === 'custom') combo.selected = 2;
        else combo.selected = 0;

        // Configure button (only visible for Custom)
        const configBtn = new Gtk.Button({
          icon_name: 'emblem-system-symbolic',
          valign: Gtk.Align.CENTER,
          tooltip_text: UI_STRINGS.editor.end.configureCustom,
          visible: currentType === 'custom',
        });
        configBtn.add_css_class('flat');

        // @ts-ignore
        combo.connect('notify::selected', () => {
          const selected = combo.selected;
          let type: 'revert' | 'keep' | 'custom' = 'revert';
          if (selected === 1) type = 'keep';
          else if (selected === 2) type = 'custom';

          if (!action.onDeactivate) action.onDeactivate = {};
          action.onDeactivate.type = type;

          configBtn.visible = type === 'custom';
          row.subtitle = getEndSummary();

          // Auto-open config if custom selected and no config
          if (type === 'custom' && !action.onDeactivate.config) {
            configBtn.emit('clicked');
          }
        });

        // @ts-ignore
        configBtn.connect('clicked', () => {
          // Open editAction with custom save callback
          // We pass a dummy action with the custom config
          const dummyAction = {
            ...action,
            config: action.onDeactivate?.config || {},
          };

          editAction(dummyAction, false, (newConfig) => {
            if (!action.onDeactivate) action.onDeactivate = { type: 'custom' };
            action.onDeactivate.config = newConfig;
            console.log(
              `[Editor] Saved custom deactivation config for ${action.type}`
            );
            row.subtitle = getEndSummary(); // Update subtitle immediately
          });
        });

        const box = new Gtk.Box({ spacing: 10 });
        box.append(configBtn);
        box.append(combo);
        row.add_suffix(box);

        endGroup.add(row);
        endRows.push(row);
      });
    };

    refreshActions(); // This will call refreshEndActions
    this.window.present();
  }
}
