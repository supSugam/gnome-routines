import debugLog from '../../utils/log.js';
import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class DndAction extends BaseAction {
  private previousDndState: boolean | null = null;

  constructor(
    id: string,
    config: { enabled: boolean },
    adapter: SystemAdapter
  ) {
    super(id, 'dnd', config, adapter);
  }

  execute(): void {
    debugLog(`[DNDAction] Setting DND to: ${this.config.enabled}`);
    // Store current state before changing
    const settings = new (require('gi://Gio').Settings)({
      schema_id: 'org.gnome.desktop.notifications',
    });
    this.previousDndState = !settings.get_boolean('show-banners');
    debugLog(`[DNDAction] Previous DND state: ${this.previousDndState}`);

    this.adapter.setDND(this.config.enabled);
  }

  revert(): void {
    if (this.previousDndState !== null) {
      debugLog(`[DNDAction] Reverting DND to: ${this.previousDndState}`);
      this.adapter.setDND(this.previousDndState);
    }
  }
}
