import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import { StateManager } from '../stateManager.js';
import { ActionType, ScreenOrientation } from '../types.js';
import debugLog from '../../utils/log.js';

export { RefreshRateAction } from './refreshRate.js';

export class DarkModeAction extends BaseAction {
  private stateManager: StateManager;
  private routineId: string;

  constructor(
    id: string,
    config: { enabled: boolean },
    adapter: SystemAdapter,
    stateManager: StateManager,
    routineId: string
  ) {
    super(id, ActionType.DARK_MODE, config, adapter);
    this.stateManager = stateManager;
    this.routineId = routineId;
  }

  async execute(): Promise<void> {
    debugLog(`[DarkModeAction] Executing: enabled=${this.config.enabled}`);
    // Save current state before changing
    const currentState = this.adapter.getDarkMode();
    this.stateManager.saveState(
      this.routineId,
      ActionType.DARK_MODE,
      currentState
    );
    this.adapter.setDarkMode(this.config.enabled);
  }

  async revert(): Promise<void> {
    // Restore saved state
    const savedState = this.stateManager.restoreState(
      this.routineId,
      ActionType.DARK_MODE
    );
    debugLog(`[DarkModeAction] Reverting. Saved state: ${savedState}`);
    if (savedState !== null) {
      this.adapter.setDarkMode(savedState);
    }
  }
}

export class NightLightAction extends BaseAction {
  private stateManager: StateManager;
  private routineId: string;

  constructor(
    id: string,
    config: { enabled: boolean },
    adapter: SystemAdapter,
    stateManager: StateManager,
    routineId: string
  ) {
    super(id, ActionType.NIGHT_LIGHT, config, adapter);
    this.stateManager = stateManager;
    this.routineId = routineId;
  }

  async execute(): Promise<void> {
    debugLog(`[NightLightAction] Executing: enabled=${this.config.enabled}`);
    const currentState = this.adapter.getNightLight();
    this.stateManager.saveState(
      this.routineId,
      ActionType.NIGHT_LIGHT,
      currentState
    );
    this.adapter.setNightLight(this.config.enabled);
  }

  async revert(): Promise<void> {
    const savedState = this.stateManager.restoreState(
      this.routineId,
      ActionType.NIGHT_LIGHT
    );
    debugLog(`[NightLightAction] Reverting. Saved state: ${savedState}`);
    if (savedState !== null) {
      this.adapter.setNightLight(savedState);
    }
  }
}

export class ScreenTimeoutAction extends BaseAction {
  private stateManager: StateManager;
  private routineId: string;

  constructor(
    id: string,
    config: { seconds: number },
    adapter: SystemAdapter,
    stateManager: StateManager,
    routineId: string
  ) {
    super(id, ActionType.SCREEN_TIMEOUT, config, adapter);
    this.stateManager = stateManager;
    this.routineId = routineId;
  }

  async execute(): Promise<void> {
    debugLog(`[ScreenTimeoutAction] Executing: seconds=${this.config.seconds}`);
    const currentTimeout = this.adapter.getScreenTimeout();
    this.stateManager.saveState(
      this.routineId,
      ActionType.SCREEN_TIMEOUT,
      currentTimeout
    );
    this.adapter.setScreenTimeout(this.config.seconds);
  }

  async revert(): Promise<void> {
    const savedTimeout = this.stateManager.restoreState(
      this.routineId,
      ActionType.SCREEN_TIMEOUT
    );
    debugLog(`[ScreenTimeoutAction] Reverting. Saved timeout: ${savedTimeout}`);
    if (savedTimeout !== null) {
      this.adapter.setScreenTimeout(savedTimeout);
    }
  }
}

export class ScreenOrientationAction extends BaseAction {
  constructor(
    id: string,
    config: { orientation: ScreenOrientation },
    adapter: SystemAdapter
  ) {
    super(id, ActionType.SCREEN_ORIENTATION, config, adapter);
  }

  async execute(): Promise<void> {
    debugLog(
      `[ScreenOrientationAction] Executing: orientation=${this.config.orientation}`
    );
    // Screen orientation is complex and doesn't have a reliable getter
    // Skip state persistence for now
    await this.adapter.setScreenOrientation(this.config.orientation);
  }

  async revert(): Promise<void> {
    debugLog(`[ScreenOrientationAction] Reverting (toggling from config)`);
    // Toggle orientation as fallback
    this.adapter.setScreenOrientation(
      this.config.orientation === ScreenOrientation.PORTRAIT
        ? ScreenOrientation.LANDSCAPE
        : ScreenOrientation.PORTRAIT
    );
  }
}
