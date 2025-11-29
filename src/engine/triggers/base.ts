import { Trigger } from '../types.js';
import { EventEmitter } from '../events.js';

export abstract class BaseTrigger extends EventEmitter implements Trigger {
    id: string;
    type: string;
    config: Record<string, any>;
    isActive: boolean = false;

    constructor(id: string, type: string, config: Record<string, any>) {
        super();
        this.id = id;
        this.type = type;
        this.config = config;
    }

    abstract check(): Promise<boolean> | boolean;

    // @ts-ignore
    on(event: 'activate' | 'deactivate', callback: () => void): void {
        super.on(event, callback);
    }

    protected setActive(active: boolean) {
        if (this.isActive !== active) {
            this.isActive = active;
            this.emit(active ? 'activate' : 'deactivate');
        }
    }
}
