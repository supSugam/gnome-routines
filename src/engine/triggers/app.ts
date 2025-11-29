import { BaseTrigger } from './base.js';

interface AppTriggerConfig {
    appIds: string[]; // Changed from appId to appIds
}

export class AppTrigger extends BaseTrigger {
    private _appSystem: any;
    private _handlerIds: number[] = [];

    constructor(id: string, config: AppTriggerConfig) {
        super(id, 'app', config);
    }

    activate(): void {
        // @ts-ignore
        const Shell = imports.gi.Shell;
        this._appSystem = Shell.AppSystem.get_default();
        
        // Listen for app state changes (started/stopped)
        const installChangedId = this._appSystem.connect('app-state-changed', () => {
            console.log('[AppTrigger] App state changed, re-evaluating...');
            this.check();
        });
        
        this._handlerIds.push(installChangedId);
        
        // Initial check
        this.check();
    }

    deactivate(): void {
        if (this._appSystem && this._handlerIds.length > 0) {
            this._handlerIds.forEach(id => this._appSystem.disconnect(id));
            this._handlerIds = [];
        }
    }

    check(): boolean {
        // @ts-ignore
        const Shell = imports.gi.Shell;
        const runningApps = this._appSystem.get_running();
        
        console.log(`[AppTrigger] Checking running apps against: ${(this.config as AppTriggerConfig).appIds.join(', ')}`);
        
        // Check if any of our target apps are running
        const match = runningApps.some((app: any) => {
            const appId = app.get_id().replace('.desktop', '');
            return (this.config as AppTriggerConfig).appIds.some(id => 
                id === appId || id === `${appId}.desktop`
            );
        });

        if (match) {
            console.log(`[AppTrigger] At least one target app is running`);
        } else {
            console.log(`[AppTrigger] No target apps running`);
        }
        
        // Always emit triggered so RoutineManager can re-evaluate
        this.emit('triggered');
        return match;
    }
}
