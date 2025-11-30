import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class PowerSaverAction extends BaseAction {
    private adapter: SystemAdapter;

    constructor(id: string, config: { enabled: boolean }, adapter: SystemAdapter) {
        super(id, 'power_saver', config);
        this.adapter = adapter;
    }

    async execute(): Promise<void> {
        this.adapter.setPowerSaver(this.config.enabled);
    }

    async revert(): Promise<void> {
        this.adapter.setPowerSaver(!this.config.enabled);
    }
}
