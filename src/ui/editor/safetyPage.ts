// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
import { UI_STRINGS } from '../utils/constants.js';
import { RoutineHealth, RoutineState } from '../../engine/types.js';

export class SafetyPage {
  private parentWindow: any;
  private settings: any;
  private routineId: string;

  constructor(parentWindow: any, settings: any, routineId: string) {
    this.parentWindow = parentWindow;
    this.settings = settings;
    this.routineId = routineId;
  }

  show() {
    const safetyWindow = new Adw.Window({
      title: UI_STRINGS.editor.safety.title,
      transient_for: this.parentWindow,
      modal: true,
      width_request: 540,
      height_request: 480,
      destroy_with_parent: true,
    });

    const toolbarView = new Adw.ToolbarView();
    safetyWindow.content = toolbarView;

    const headerBar = new Adw.HeaderBar();
    toolbarView.add_top_bar(headerBar);

    const content = new Adw.PreferencesPage();
    toolbarView.content = content;

    // Load State
    let state: RoutineState | null = null;
    try {
      const json = this.settings.get_string('routine-states');
      if (json) {
        const parsed = JSON.parse(json);
        const routineData = parsed[this.routineId];
        if (routineData && routineData.health_status) {
          state = routineData.health_status as RoutineState;
        }
      }
    } catch (e) {
      console.error('[Editor] Failed to load routine state:', e);
    }

    if (!state) {
      state = {
        health: RoutineHealth.UNKNOWN,
        lastRun: 0,
        runCount: 0,
        failureCount: 0,
        history: [],
      };
    }

    // Health Status Group
    const statusGroup = new Adw.PreferencesGroup({
      title: UI_STRINGS.editor.safety.health,
    });
    content.add(statusGroup);

    const healthRow = new Adw.ActionRow({
      title: UI_STRINGS.editor.safety.status[state.health],
      subtitle:
        state.health === RoutineHealth.OK
          ? 'Functioning normally'
          : state.lastError || 'No conflicts detected',
    });

    // Icon
    let iconName = 'dialog-question-symbolic';
    let cssClass = '';
    if (state.health === RoutineHealth.OK) {
      iconName = 'emblem-ok-symbolic';
      cssClass = 'success';
    } else if (state.health === RoutineHealth.WARNING) {
      iconName = 'dialog-warning-symbolic';
      cssClass = 'warning';
    } else if (state.health === RoutineHealth.ERROR) {
      iconName = 'dialog-error-symbolic';
      cssClass = 'error';
    }

    const icon = new Gtk.Image({
      icon_name: iconName,
      pixel_size: 24,
    });
    if (cssClass) icon.add_css_class(cssClass);
    healthRow.add_prefix(icon);
    statusGroup.add(healthRow);

    // Stats
    const statsGroup = new Adw.PreferencesGroup({ title: 'Statistics' });
    content.add(statsGroup);
    statsGroup.add(
      new Adw.ActionRow({
        title: 'Run Count',
        subtitle: state.runCount.toString(),
      })
    );
    if (state.lastRun > 0) {
      statsGroup.add(
        new Adw.ActionRow({
          title: 'Last Run',
          subtitle: new Date(state.lastRun).toLocaleString(),
        })
      );
    }

    // History Group
    const historyGroup = new Adw.PreferencesGroup({
      title: UI_STRINGS.editor.safety.history,
    });
    content.add(historyGroup);

    if (state.history.length === 0) {
      historyGroup.add(
        new Adw.ActionRow({ title: UI_STRINGS.editor.safety.noHistory })
      );
    } else {
      state.history.forEach((log: any) => {
        const row = new Adw.ActionRow({
          title: `${log.status.toUpperCase()} - ${log.type}`,
          subtitle: `${new Date(log.timestamp).toLocaleTimeString()} - ${
            log.message || 'No details'
          }`,
        });
        if (log.status === 'failure') {
          row.add_css_class('error');
          const warnIcon = new Gtk.Image({
            icon_name: 'dialog-error-symbolic',
          });
          row.add_suffix(warnIcon);
        }
        historyGroup.add(row);
      });
    }

    safetyWindow.present();
  }
}
