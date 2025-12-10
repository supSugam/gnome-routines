// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
import { BaseEditor } from '../../components/baseEditor.js';
import { ExecuteCommandActionConfig } from '../../../engine/types.js';

export class ExecuteCommandEditor extends BaseEditor {
  protected config: ExecuteCommandActionConfig;

  constructor(config: any, onChange: () => void) {
    super(config, onChange);
    this.config = config as ExecuteCommandActionConfig;
  }

  render(group: any): void {
    // Container for Label + TextView (mimicking a form group)
    const box = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 6,
      margin_top: 12,
      margin_bottom: 12,
      margin_start: 12, // Match row padding usually
      margin_end: 12,
    });

    // Label
    const label = new Gtk.Label({
      label: 'Command (Shell)',
      xalign: 0,
      css_classes: ['heading'],
    });
    box.append(label);

    // Scrollable Text Area
    const scroller = new Gtk.ScrolledWindow({
      height_request: 120, // Min height for textarea
      max_content_height: 300,
      propagate_natural_height: true,
      hscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
      vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
      css_classes: ['view', 'frame'], // 'frame' gives it a border often
    });

    const textView = new Gtk.TextView({
      monospace: true,
      wrap_mode: Gtk.WrapMode.WORD_CHAR,
      bottom_margin: 8,
      top_margin: 8,
      left_margin: 8,
      right_margin: 8,
    });

    textView.buffer.text = this.config.command || '';

    // @ts-ignore
    textView.buffer.connect('changed', () => {
      this.config.command = textView.buffer.text;
      this.onChange();
    });

    scroller.set_child(textView);
    box.append(scroller);

    // We add our custom box to the preferences group.
    // AdwPreferencesGroup supports arbitrary widgets.
    group.add(box);
  }

  validate(): boolean | string {
    if (!this.config.command || this.config.command.trim() === '') {
      return 'Command cannot be empty';
    }
    return true;
  }
}
