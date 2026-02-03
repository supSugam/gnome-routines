// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
import { BaseEditor } from '../../components/baseEditor.js';

import {
  NotificationActionConfig,
  NotificationUrgency,
} from '../../../engine/types.js';

export class NotificationActionEditor extends BaseEditor {
  private get notifConfig(): NotificationActionConfig {
    return this.config as NotificationActionConfig;
  }

  render(group: any): void {
    // Defaults
    if (!this.notifConfig.urgency)
      this.notifConfig.urgency = NotificationUrgency.NORMAL;

    // Title
    const titleRow = new Adw.EntryRow({
      title: 'Title',
      text: this.notifConfig.title || '',
    });

    group.add(titleRow);

    // Message
    const messageRow = new Adw.EntryRow({
      title: 'Message',
      text: this.notifConfig.message || '',
    });

    group.add(messageRow);

    // Icon
    const iconRow = new Adw.EntryRow({
      title: 'Icon Name (Optional)',
      text: this.notifConfig.iconName || '',
    });

    iconRow.set_tooltip_text(
      'Enter a valid icon name (e.g. dialog-information, weather-clear)'
    );
    group.add(iconRow);

    // Urgency
    const urgencyModel = new Gtk.StringList({
      strings: ['Low', 'Normal', 'Critical'],
    });
    const urgencies = [
      NotificationUrgency.LOW,
      NotificationUrgency.NORMAL,
      NotificationUrgency.CRITICAL,
    ];

    const urgencyRow = new Adw.ComboRow({
      title: 'Urgency',
      model: urgencyModel,
      selected: urgencies.indexOf(this.notifConfig.urgency),
    });

    group.add(urgencyRow);

    const updateUrgencySubtitle = () => {
      const selected = urgencies[urgencyRow.selected];

      switch (selected) {
        case NotificationUrgency.LOW:
          urgencyRow.subtitle = 'Silent. Appears in notification list only.';
          break;

        case NotificationUrgency.NORMAL:
          urgencyRow.subtitle =
            'Standard. Appears as a pop-up banner and in list.';
          break;

        case NotificationUrgency.CRITICAL:
          urgencyRow.subtitle = 'Persistent. Stays on screen until dismissed.';
          break;
      }
    };

    updateUrgencySubtitle(); // Init

    // Bindings
    // @ts-ignore
    titleRow.connect('changed', () => {
      this.notifConfig.title = titleRow.text;
      this.onChange();
    });

    // @ts-ignore
    messageRow.connect('changed', () => {
      this.notifConfig.message = messageRow.text;
      this.onChange();
    });

    // @ts-ignore
    iconRow.connect('changed', () => {
      this.notifConfig.iconName = iconRow.text;
      this.onChange();
    });

    // @ts-ignore
    urgencyRow.connect('notify::selected', () => {
      this.notifConfig.urgency = urgencies[urgencyRow.selected];
      updateUrgencySubtitle();
      this.onChange();
    });
  }

  validate(): boolean | string {
    if (!this.notifConfig.title) return 'Title is required';

    return true;
  }
}
