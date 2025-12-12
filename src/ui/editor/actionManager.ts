// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import GLib from 'gi://GLib';

import { ActionEditorFactory } from '../components/actionEditorFactory.js';
import { getActionSummary, getActionTitle } from '../utils/summaryHelpers.js';
import { ActionType, DeactivateStrategy } from '../../engine/types.js';
import { ACTION_METADATA } from '../../engine/actionMetadata.js';
import { UI_STRINGS } from '../utils/constants.js';
import debugLog from '../../utils/log.js';

export class ActionManager {
  private parentWindow: any;
  private routine: any;

  private actionGroup: any;
  private endGroup: any;
  private actionChildren: any[] = [];
  private endChildren: any[] = [];

  constructor(parentWindow: any, routine: any) {
    this.parentWindow = parentWindow;
    this.routine = routine;
  }

  createGroups(page: any) {
    this.actionGroup = new Adw.PreferencesGroup({
      title: UI_STRINGS.editor.then.title,
      description: UI_STRINGS.editor.then.description,
    });
    page.add(this.actionGroup);

    this.endGroup = new Adw.PreferencesGroup({
      title: UI_STRINGS.editor.end.title,
      description: UI_STRINGS.editor.end.description,
    });
    page.add(this.endGroup);

    this.refresh();
  }

  private refresh() {
    this.refreshActions();
    this.refreshEndActions();
  }

  private refreshActions() {
    this.actionChildren.forEach((c) => this.actionGroup.remove(c));
    this.actionChildren = [];

    this.routine.actions.forEach((action: any, index: number) => {
      const row = new Adw.ActionRow({
        title: getActionTitle(action.type),
        subtitle: getActionSummary(action),
      });

      // Edit on click
      // @ts-ignore
      row.connect('activated', () => this.editAction(action, false, () => this.refresh()));
      row.activatable = true;

      const deleteBtn = new Gtk.Button({
        icon_name: 'user-trash-symbolic',
        valign: Gtk.Align.CENTER,
      });
      deleteBtn.add_css_class('flat');
      // @ts-ignore
      deleteBtn.connect('clicked', () => {
        this.routine.actions.splice(index, 1);
        this.refresh();
      });
      row.add_suffix(deleteBtn);

      this.actionGroup.add(row);
      this.actionChildren.push(row);
    });

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
      this.editAction(newAction, true, () => this.refresh());
    });
    this.actionGroup.add(addActionBtn);
    this.actionChildren.push(addActionBtn);
  }

  private refreshEndActions() {
    this.endChildren.forEach((c) => this.endGroup.remove(c));
    this.endChildren = [];

    const hasRevertible = this.routine.actions.some((action: any) => {
      const meta = ACTION_METADATA[action.type as ActionType];
      return meta?.canRevert;
    });
    this.endGroup.visible = hasRevertible;

    if (!hasRevertible) return;

    this.routine.actions.forEach((action: any) => {
      const meta = ACTION_METADATA[action.type as ActionType];
      if (!meta?.canRevert) return;

      const getEndSummary = () => {
        const type = action.onDeactivate?.type || 'revert';
        if (type === 'revert') return UI_STRINGS.editor.end.revert;
        if (type === 'keep') return UI_STRINGS.editor.end.keep;
        if (type === 'custom') {
          if (action.onDeactivate?.config) {
            const dummy = { ...action, config: action.onDeactivate.config };
            return `${UI_STRINGS.editor.end.customPrefix}${getActionSummary(dummy)}`;
          }
          return UI_STRINGS.editor.end.custom;
        }
        return '';
      };

      const row = new Adw.ActionRow({
        title: getActionSummary(action),
        subtitle: getEndSummary(),
      });

      const model = new Gtk.StringList({
        strings: UI_STRINGS.editor.end.behaviors,
      });
      const combo = new Gtk.DropDown({
        model: model,
        valign: Gtk.Align.CENTER,
      });

      const currentType = action.onDeactivate?.type || 'revert';
      if (currentType === 'keep') combo.selected = 1;
      else if (currentType === 'custom') combo.selected = 2;
      else combo.selected = 0;

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

        if (type === 'custom' && !action.onDeactivate.config) {
          configBtn.emit('clicked');
        }
      });

      // @ts-ignore
      configBtn.connect('clicked', () => {
        const dummyAction = {
          ...action,
          config: action.onDeactivate?.config || {},
        };

        this.editAction(dummyAction, false, (newConfig) => {
             // callback receives config only if specific mode? 
             // Wait, editAction sends object updated.
             // I need to customize editAction to support returning config or updating dummy.
             
             // My editAction writes to passed object.
             // So I read from dummyAction.
             if (!action.onDeactivate) action.onDeactivate = { type: 'custom' };
            action.onDeactivate.config = dummyAction.config;
            debugLog(
              `[Editor] Saved custom deactivation config for ${action.type}`
            );
            row.subtitle = getEndSummary();
        }, true); // Custom flag
      });

      const box = new Gtk.Box({ spacing: 10 });
      box.append(configBtn);
      box.append(combo);
      row.add_suffix(box);

      this.endGroup.add(row);
      this.endChildren.push(row);
    });
  }

  private editAction(
    action: any,
    isNew: boolean,
    onSave: (config?: any) => void,
    isCustomConfigMode: boolean = false
  ) {
    const actionWindow = new Adw.Window({
      title: isNew ? 'Add Action' : 'Edit Action',
      transient_for: this.parentWindow,
      modal: true,
      width_request: 540,
      height_request: 480,
      destroy_with_parent: true,
    });

    const toolbarView = new Adw.ToolbarView();
    actionWindow.content = toolbarView;

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

    let tempConfig = JSON.parse(JSON.stringify(action.config));
    let currentType = action.type;

    const actionTypes = [
        { id: ActionType.OPEN_APP, title: UI_STRINGS.actions.openApp },
        { id: ActionType.WIFI, title: UI_STRINGS.actions.wifi },
        { id: ActionType.CONNECT_WIFI, title: UI_STRINGS.actions.connectWifi },
        { id: ActionType.BLUETOOTH, title: UI_STRINGS.actions.bluetooth },
        { id: ActionType.CONNECT_BLUETOOTH, title: UI_STRINGS.actions.connectBluetooth },
        { id: ActionType.DISCONNECT_BLUETOOTH, title: UI_STRINGS.actions.disconnectBluetooth },
        { id: ActionType.DND, title: UI_STRINGS.actions.dnd },
        { id: ActionType.AIRPLANE_MODE, title: UI_STRINGS.actions.airplaneMode },
        { id: ActionType.VOLUME, title: UI_STRINGS.actions.volume },
        { id: ActionType.BRIGHTNESS, title: UI_STRINGS.actions.brightness },
        { id: ActionType.KEYBOARD_BRIGHTNESS, title: UI_STRINGS.actions.keyboardBrightness },
        { id: ActionType.WALLPAPER, title: UI_STRINGS.actions.wallpaper },
        { id: ActionType.DARK_MODE, title: UI_STRINGS.actions.darkMode },
        { id: ActionType.NIGHT_LIGHT, title: UI_STRINGS.actions.nightLight },
        { id: ActionType.POWER_SAVER, title: UI_STRINGS.actions.powerSaver },
        { id: ActionType.SCREEN_TIMEOUT, title: UI_STRINGS.actions.screenTimeout },
        { id: ActionType.SCREEN_ORIENTATION, title: UI_STRINGS.actions.screenOrientation },
        { id: ActionType.TAKE_SCREENSHOT, title: UI_STRINGS.actions.takeScreenshot },
        { id: ActionType.NOTIFICATION, title: UI_STRINGS.actions.notification },
        { id: ActionType.CLIPBOARD, title: UI_STRINGS.actions.clearClipboard },
        { id: ActionType.OPEN_LINK, title: UI_STRINGS.actions.openLink },
        { id: ActionType.EXECUTE_COMMAND, title: UI_STRINGS.actions.executeCommand },
    ];

    const typeModel = new Gtk.StringList({
      strings: actionTypes.map((t) => t.title),
    });
    const typeRow = new Adw.ComboRow({
      title: UI_STRINGS.editor.then.actionType,
      model: typeModel,
      selected: actionTypes.findIndex((t) => t.id === currentType),
      visible: !isCustomConfigMode, // Hide type selector if only editing config
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
        // Update the action object passed in
        action.type = currentType;
        action.config = tempConfig;
        
        if (isNew) this.routine.actions.push(action);
        
        onSave(); // Notify caller
        actionWindow.close();
    });

    actionWindow.present();
  }
}
