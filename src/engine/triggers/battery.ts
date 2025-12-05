import { BaseTrigger } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class BatteryTrigger extends BaseTrigger {
    private adapter: SystemAdapter;
    public _isActivated: boolean = false;

    constructor(id: string, config: { 
        mode: 'status' | 'level', 
        status?: 'charging' | 'discharging',
        levelType?: 'below' | 'equal_or_above',
        level?: number 
    }, adapter: SystemAdapter) {
        super(id, 'battery', config);
        this.adapter = adapter;
    }

    async check(): Promise<boolean> {
        if (this.config.mode === 'status') {
            const isCharging = this.adapter.isCharging();
            debugLog(
              `[BatteryTrigger] Checking status. Current: ${
                isCharging ? 'charging' : 'discharging'
              }, Target: ${this.config.status}`
            );
            return this.config.status === 'charging' ? isCharging : !isCharging;
        } else {
            const currentLevel = this.adapter.getBatteryLevel();
            const targetLevel = this.config.level || 0;
            debugLog(
              `[BatteryTrigger] Checking level. Current: ${currentLevel}, Target: ${this.config.levelType} ${targetLevel}`
            );
            
            if (this.config.levelType === 'below') {
                return currentLevel < targetLevel;
            } else {
                return currentLevel >= targetLevel;
            }
        }
    }

    activate(): void {
        if (this._isActivated) return;
        
        debugLog(`[BatteryTrigger] Activating listener`);
        this.adapter.onBatteryStateChanged((level, isCharging) => {
            debugLog(
              `[BatteryTrigger] Battery state changed: ${level}%, Charging: ${isCharging}`
            );
            this.emit('triggered');
        });
        
        this._isActivated = true;
    }
}
