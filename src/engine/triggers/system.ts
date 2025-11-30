import { BaseTrigger } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class SystemTrigger extends BaseTrigger {
    private adapter: SystemAdapter;
    public _isActivated: boolean = false;

    constructor(id: string, config: { 
        type: 'power_saver' | 'dark_mode' | 'airplane_mode' | 'headphones',
        state: 'on' | 'off' | 'connected' | 'disconnected'
    }, adapter: SystemAdapter) {
        super(id, 'system', config);
        this.adapter = adapter;
    }

    async check(): Promise<boolean> {
        let currentState = false;
        
        switch (this.config.type) {
            case 'power_saver':
                currentState = this.adapter.getPowerSaverState();
                break;
            case 'dark_mode':
                currentState = this.adapter.getDarkModeState();
                break;
            case 'airplane_mode':
                currentState = this.adapter.getAirplaneModeState();
                break;
            case 'headphones':
                currentState = this.adapter.getWiredHeadphonesState();
                break;
        }

        const targetState = this.config.state === 'on' || this.config.state === 'connected';
        console.log(`[SystemTrigger] Checking ${this.config.type}. Current: ${currentState}, Target: ${targetState}`);
        
        return currentState === targetState;
    }

    activate(): void {
        if (this._isActivated) return;
        
        console.log(`[SystemTrigger] Activating listener for ${this.config.type}`);
        
        const callback = (state: boolean) => {
            console.log(`[SystemTrigger] ${this.config.type} changed to: ${state}`);
            this.emit('triggered');
        };

        switch (this.config.type) {
            case 'power_saver':
                this.adapter.onPowerSaverStateChanged(callback);
                break;
            case 'dark_mode':
                this.adapter.onDarkModeStateChanged(callback);
                break;
            case 'airplane_mode':
                this.adapter.onAirplaneModeStateChanged(callback);
                break;
            case 'headphones':
                this.adapter.onWiredHeadphonesStateChanged(callback);
                break;
        }
        
        this._isActivated = true;
    }
}
