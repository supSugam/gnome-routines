import { Trigger } from './types.js';
import { AppTrigger } from './triggers/app.js';
import { TimeTrigger } from './triggers/time.js';

export class TriggerFactory {
    static create(data: any): Trigger | null {
        switch (data.type) {
            case 'app':
                return new AppTrigger(data.id, data.config);
            case 'time':
                return new TimeTrigger(data.id, data.config);
            default:
                console.warn(`Unknown trigger type: ${data.type}`);
                return null;
        }
    }
}
