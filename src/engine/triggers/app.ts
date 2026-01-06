// @ts-ignore
import Shell from 'gi://Shell';
import debugLog from '../../utils/log.js';
import { TriggerType, TriggerStrategy } from '../types.js';
import { BaseTrigger } from './base.js';

interface AppTriggerConfig {
  appIds: string[]; // Changed from appId to appIds
}

export class AppTrigger extends BaseTrigger {
  private _appSystem: any;
  private _handlerIds: number[] = [];

  constructor(id: string, config: AppTriggerConfig) {
    super(id, TriggerType.APP, config);
  }

  activate(): void {
    this._appSystem = Shell.AppSystem.get_default();

    // Listen for app state changes
    const installChangedId = this._appSystem.connect(
      'app-state-changed',
      () => {
        debugLog('[AppTrigger] App state changed, re-evaluating...');
        this.check();
      }
    );

    this._handlerIds.push(installChangedId);

    this.check();
  }

  deactivate(): void {
    if (this._appSystem && this._handlerIds.length > 0) {
      this._handlerIds.forEach((id) => this._appSystem.disconnect(id));
      this._handlerIds = [];
    }
  }

  private _lastMatch: boolean | null = null;

  check(): boolean {
    const runningApps = this._appSystem.get_running();

    debugLog(
      `[AppTrigger] Checking running apps against: ${(
        this.config as AppTriggerConfig
      ).appIds.join(', ')}`
    );

    // Check running apps
    const match = runningApps.some((app: any) => {
      const appId = app.get_id().replace('.desktop', '');
      return (this.config as AppTriggerConfig).appIds.some(
        (id) => id === appId || id === `${appId}.desktop`
      );
    });

    if (match) {
      debugLog(`[AppTrigger] At least one target app is running`);
    } else {
      debugLog(`[AppTrigger] No target apps running`);
    }

    // Emit only on state change
    if (this._lastMatch === null) {
      const shouldIgnoreInitial =
        this.strategy === TriggerStrategy.NEW_CHANGE_ONLY;
      debugLog(
        `[AppTrigger] Initial Check: ${match} -> Strategy: ${this.strategy}`
      );

      this._lastMatch = match;

      if (!shouldIgnoreInitial && match) {
        this.emit('triggered');
      }
      return match;
    }

    if (this._lastMatch !== match) {
      debugLog(`[AppTrigger] State changed: ${this._lastMatch} -> ${match}`);
      this._lastMatch = match;
      if (match) {
        debugLog(`[AppTrigger] Condition met (TRUE). Emitting 'triggered'.`);
      } else {
        debugLog(`[AppTrigger] Condition lost (FALSE). Emitting 'triggered'.`);
      }
      this.emit('triggered');
    }

    return match;
  }
}
