import { BaseTrigger } from './base.js';

export class TimeTrigger extends BaseTrigger {
    constructor(id: string, config: { time?: string, startTime?: string, endTime?: string, days?: number[] }) {
        super(id, 'time', config);
    }

    check(): boolean {
        const now = new Date();
        
        // Day check
        if (this.config.days && this.config.days.length > 0) {
            // GNOME/JS Date.getDay() returns 0 for Sunday.
            // Our UI likely maps Mon=0...Sun=6 or similar.
            // Let's assume standard JS 0=Sun, 1=Mon...
            if (!this.config.days.includes(now.getDay())) {
                return false;
            }
        }

        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        // Specific Time (Event-like, but treated as 1-minute state)
        if (this.config.time) {
            const [targetHour, targetMinute] = this.config.time.split(':').map(Number);
            const targetMinutes = targetHour * 60 + targetMinute;
            return currentMinutes === targetMinutes;
        }

        // Time Period (State)
        if (this.config.startTime && this.config.endTime) {
            const [startH, startM] = this.config.startTime.split(':').map(Number);
            const [endH, endM] = this.config.endTime.split(':').map(Number);
            
            const startTotal = startH * 60 + startM;
            const endTotal = endH * 60 + endM;

            if (startTotal < endTotal) {
                // Normal range (e.g. 09:00 to 17:00)
                return currentMinutes >= startTotal && currentMinutes < endTotal;
            } else {
                // Overnight range (e.g. 22:00 to 06:00)
                return currentMinutes >= startTotal || currentMinutes < endTotal;
            }
        }

        return false;
    }
}
