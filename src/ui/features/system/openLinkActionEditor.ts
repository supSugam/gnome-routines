// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
import { BaseEditor } from '../../components/baseEditor.js';

export class OpenLinkActionEditor extends BaseEditor {
  private urls: string[] = [];

  constructor(originalConfig: any, onChange: () => void) {
    super(originalConfig, onChange);
    // Initialize urls from config, handling migration from 'url'
    this.urls = [...(originalConfig.urls || [])];

    if (originalConfig.url && !this.urls.includes(originalConfig.url)) {
      this.urls.unshift(originalConfig.url);
    }

    // Ensure at least one empty slot if new
    if (this.urls.length === 0) {
      this.urls.push('');
    }
  }

  private group: any;

  getConfig(): any {
    return {
      ...this.config,
      urls: this.urls.filter((u) => u.trim() !== ''),
    };
  }

  render(group: any): void {
    this.group = group;
    this.rebuildRows();
  }

  private rebuildRows() {
    // Clear existing rows (Adw 1.4+ has remove, older might need remove_network)
    // Safe GJS way: iterate children
    let child = this.group.get_first_child();

    while (child) {
      const next = child.get_next_sibling();

      this.group.remove(child);
      child = next;
    }

    // Add rows
    this.urls.forEach((url, index) => {
      this.createUrlRow(url, index);
    });

    // Add Button
    const addRow = new Adw.ActionRow({
      title: 'Add New Link',
      activatable: true,
    });
    const addButton = new Gtk.Button({
      icon_name: 'list-add-symbolic',
      valign: Gtk.Align.CENTER,
      css_classes: ['flat'],
    });

    // @ts-ignore
    addButton.connect('clicked', () => {
      this.urls.push('');
      this.rebuildRows();
      this.onChange();
    });
    addRow.add_suffix(addButton);
    // @ts-ignore
    addRow.connect('activated', () => {
      this.urls.push('');
      this.rebuildRows();
      this.onChange();
    });

    this.group.add(addRow);
  }

  private createUrlRow(url: string, index: number) {
    const row = new Adw.EntryRow({
      title: `Link #${index + 1}`,
      text: url,
      show_apply_button: false,
    });

    const deleteBtn = new Gtk.Button({
      icon_name: 'user-trash-symbolic',
      valign: Gtk.Align.CENTER,
      css_classes: ['flat', 'error'],
      tooltip_text: 'Remove link',
    });

    // @ts-ignore
    deleteBtn.connect('clicked', () => {
      this.urls.splice(index, 1);
      this.rebuildRows();
      this.onChange();
    });

    // @ts-ignore
    row.connect('changed', () => {
      this.urls[index] = row.text;
      this.onChange(); // Trigger validation
    });

    row.add_suffix(deleteBtn);
    this.group.add(row);
  }

  validate(): boolean | string {
    const validUrls = this.urls.filter((u) => u && u.trim() !== '');

    if (validUrls.length === 0) {
      return 'At least one valid URL is required';
    }

    return true;
  }
}
