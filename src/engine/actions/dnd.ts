import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class DndAction extends BaseAction {
    constructor(id: string, config: { enabled: boolean }, adapter: SystemAdapter) {
        super(id, 'dnd', config, adapter);
    }

    execute(): void {
        this.adapter.setDND(this.config.enabled);
    }

    revert(): void {
        // Revert to the opposite state
        this.adapter.setDND(!this.config.enabled);
    }
}
