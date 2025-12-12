import debugLog from '../utils/log.js';
// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import GLib from 'gi://GLib';

import { UI_STRINGS } from './utils/constants.js';
import { SafetyPage } from './editor/safetyPage.js';
import { TriggerManager } from './editor/triggerManager.js';
import { ActionManager } from './editor/actionManager.js';

export class RoutineEditor {
  private routine: any;
  private onSave: (routine: any) => void;
  private window: any;
  private settings: any;
  private isNew: boolean;

  constructor(
    settings: any,
    routine: any | null,
    onSave: (routine: any) => void
  ) {
    this.settings = settings;
    this.isNew = !routine;
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
      width_request: 600,
      height_request: 540,
      destroy_with_parent: true,
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
      title: this.isNew ? UI_STRINGS.editor.titleNew : UI_STRINGS.editor.title,
      tag: 'main',
    });
    navView.add(mainPage);

    const toolbarView = new Adw.ToolbarView();
    mainPage.child = toolbarView;

    const headerBar = new Adw.HeaderBar();
    toolbarView.add_top_bar(headerBar);

    this.setupHeaderActions(headerBar);

    const content = new Adw.PreferencesPage();
    toolbarView.content = content;

    // General Section
    const group = new Adw.PreferencesGroup({
      title: UI_STRINGS.editor.general,
    });
    content.add(group);

    const nameEntry = new Adw.EntryRow({
      title: UI_STRINGS.editor.name,
      text: this.routine.name,
    });
    // @ts-ignore
    nameEntry.connect('notify::text', () => {
      this.routine.name = nameEntry.text;
    });
    group.add(nameEntry);

    // If Section (Triggers)
    const triggerManager = new TriggerManager(this.window, this.routine);
    const triggerGroup = triggerManager.createGroup();
    content.add(triggerGroup);

    // Then & End Section (Actions)
    const actionManager = new ActionManager(this.window, this.routine);
    actionManager.createGroups(content);

    this.window.present();
  }

  private setupHeaderActions(headerBar: any) {
    const saveBtn = new Gtk.Button({
      label: UI_STRINGS.editor.save,
      css_classes: ['suggested-action'],
    });
    // @ts-ignore
    saveBtn.connect('clicked', () => {
      debugLog('[Editor] Save clicked');

      // Name is updated via notify signal on entry
      if (!this.routine.name) {
        debugLog('[Editor] Name is empty');
        return;
      }
      try {
        debugLog('[Editor] Calling onSave', JSON.stringify(this.routine));
        this.onSave(this.routine);
        debugLog('[Editor] onSave completed');
        this.window.close();
      } catch (e) {
        console.error('[Editor] Save failed', e);
      }
    });
    headerBar.pack_end(saveBtn);

    // Safety Button
    const safetyBtn = new Gtk.Button({
      icon_name: 'security-high-symbolic',
      tooltip_text: UI_STRINGS.editor.safety.title,
    });
    safetyBtn.add_css_class('flat');
    // @ts-ignore
    safetyBtn.connect('clicked', () => {
      const safetyPage = new SafetyPage(
        this.window,
        this.settings,
        this.routine.id
      );
      safetyPage.show();
    });
    headerBar.pack_end(safetyBtn);
  }
}
