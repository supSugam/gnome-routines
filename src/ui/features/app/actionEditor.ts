// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import Gio from 'gi://Gio';
import { BaseEditor } from '../../components/baseEditor.js';

export class OpenAppActionEditor extends BaseEditor {
  render(group: any): void {
    const appSearch = new Gtk.SearchEntry({
      placeholder_text: 'Search Apps...',
    });
    appSearch.margin_bottom = 10;
    group.add(appSearch);

    const appScroll = new Gtk.ScrolledWindow();
    appScroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
    appScroll.min_content_height = 300;
    appScroll.propagate_natural_height = true;

    const appList = new Gtk.ListBox({
      selection_mode: Gtk.SelectionMode.NONE,
    });
    appList.add_css_class('boxed-list');
    appScroll.child = appList;
    group.add(appScroll);

    if (!this.config.appIds) {
      this.config.appIds = [];
    }
    const selectedAppIds = new Set(this.config.appIds);

    const allApps = Gio.AppInfo.get_all().filter((app: any) =>
      app.should_show()
    );
    // @ts-ignore
    const appRows: { row: Adw.ActionRow; name: string }[] = [];

    allApps.forEach((app: any) => {
      const row = new Adw.ActionRow({ title: app.get_name() });

      const icon = app.get_icon();
      if (icon) {
        const img = Gtk.Image.new_from_gicon(icon);
        img.pixel_size = 32;
        row.add_prefix(img);
      }

      const toggle = new Gtk.Switch({
        active: selectedAppIds.has(app.get_id()),
      });
      toggle.valign = Gtk.Align.CENTER;

      // @ts-ignore
      toggle.connect('notify::active', () => {
        if (toggle.active) selectedAppIds.add(app.get_id());
        else selectedAppIds.delete(app.get_id());

        this.config.appIds = Array.from(selectedAppIds);
        this.onChange();
      });

      row.add_suffix(toggle);
      appList.append(row);
      appRows.push({ row, name: app.get_name().toLowerCase() });
    });

    // @ts-ignore
    appSearch.connect('search-changed', () => {
      const query = appSearch.text.toLowerCase();
      appRows.forEach((item) => {
        item.row.visible = item.name.includes(query);
      });
    });
  }

  validate(): boolean | string {
    if (!this.config.appIds || this.config.appIds.length === 0) {
      return 'Select at least one app';
    }
    return true;
  }
}
