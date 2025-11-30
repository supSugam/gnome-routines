import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import { StateManager } from '../stateManager.js';

export class DarkModeAction extends BaseAction {
    private stateManager: StateManager;
    private routineId: string;

    constructor(id: string, config: { enabled: boolean }, adapter: SystemAdapter, stateManager: StateManager, routineId: string) {
        super(id, 'dark_mode', config, adapter);
        this.stateManager = stateManager;
        this.routineId = routineId;
    }

    async execute(): Promise<void> {
        // Save current state before changing
        const currentState = this.adapter.getDarkMode();
        this.stateManager.saveState(this.routineId, 'dark_mode', currentState);
        this.adapter.setDarkMode(this.config.enabled);
    }

    async revert(): Promise<void> {
        // Restore saved state
        const savedState = this.stateManager.restoreState(this.routineId, 'dark_mode');
        if (savedState !== null) {
            this.adapter.setDarkMode(savedState);
        }
    }
}

export class NightLightAction extends BaseAction {
    private stateManager: StateManager;
    private routineId: string;

    constructor(id: string, config: { enabled: boolean }, adapter: SystemAdapter, stateManager: StateManager, routineId: string) {
        super(id, 'night_light', config, adapter);
        this.stateManager = stateManager;
        this.routineId = routineId;
    }

    async execute(): Promise<void> {
        const currentState = this.adapter.getNightLight();
        this.stateManager.saveState(this.routineId, 'night_light', currentState);
        this.adapter.setNightLight(this.config.enabled);
    }

    async revert(): Promise<void> {
        const savedState = this.stateManager.restoreState(this.routineId, 'night_light');
        if (savedState !== null) {
            this.adapter.setNightLight(savedState);
        }
    }
}

export class ScreenTimeoutAction extends BaseAction {
    private stateManager: StateManager;
    private routineId: string;

    constructor(id: string, config: { seconds: number }, adapter: SystemAdapter, stateManager: StateManager, routineId: string) {
        super(id, 'screen_timeout', config, adapter);
        this.stateManager = stateManager;
        this.routineId = routineId;
    }

    async execute(): Promise<void> {
        const currentTimeout = this.adapter.getScreenTimeout();
        this.stateManager.saveState(this.routineId, 'screen_timeout', currentTimeout);
        this.adapter.setScreenTimeout(this.config.seconds);
    }

    async revert(): Promise<void> {
        const savedTimeout = this.stateManager.restoreState(this.routineId, 'screen_timeout');
        if (savedTimeout !== null) {
            this.adapter.setScreenTimeout(savedTimeout);
        }
    }
}

export class ScreenOrientationAction extends BaseAction {
    constructor(id: string, config: { orientation: 'portrait' | 'landscape' }, adapter: SystemAdapter) {
        super(id, 'screen_orientation', config, adapter);
    }

    async execute(): Promise<void> {
        // Screen orientation is complex and doesn't have a reliable getter
        // Skip state persistence for now
        this.adapter.setScreenOrientation(this.config.orientation);
    }

    async revert(): Promise<void> {
        // Toggle orientation as fallback
        this.adapter.setScreenOrientation(this.config.orientation === 'portrait' ? 'landscape' : 'portrait');
    }
}
