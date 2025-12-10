
// @ts-ignore
import GLib from 'gi://GLib';
// @ts-ignore
import Gio from 'gi://Gio';

import { BaseTrigger } from './base.js';
import { TriggerType, StartupTriggerConfig, TriggerStrategy } from '../types.js';
import debugLog from '../../utils/log.js';

import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class StartupTrigger extends BaseTrigger {
  private adapter: SystemAdapter;
  private hasFired: boolean = false;

  constructor(
    id: string,
    config: StartupTriggerConfig,
    adapter: SystemAdapter
  ) {
    super(id, TriggerType.STARTUP, config, TriggerStrategy.STATE_PERSISTENT);
    this.adapter = adapter;
  }

  async check(): Promise<boolean> {
    if (!this.adapter) {
      debugLog('[StartupTrigger] No adapter available');
      return false;
    }

    if (this.hasFired) {
      // Don't spam debug log here as it will be called frequently by manager
      return false;
    }

    const { isStartup, timeSinceInit } = this.adapter.getStartupState();

    debugLog(
      `[GnomeRoutines-DEBUG] StartupTrigger Check - isStartup: ${isStartup}, timeSinceInit: ${timeSinceInit}ms`
    );

    // We only trigger if it is indeed a startup session AND we are checking
    // reasonably close to initialization.
    // Increased grace period to 120s to allow for slow logins or delayed routine checks.
    const GRACE_PERIOD_MS = 120000;

    if (isStartup && timeSinceInit < GRACE_PERIOD_MS) {
      debugLog(`[GnomeRoutines-DEBUG] Startup condition MET. Firing trigger.`);
      this.hasFired = true;
      return true;
    } else {
      if (!isStartup) {
        debugLog(
          `[GnomeRoutines-DEBUG] Startup condition NOT met: Not a startup session (Lock file existed).`
        );
      } else {
        debugLog(
          `[GnomeRoutines-DEBUG] Startup condition NOT met: Grace period expired (${timeSinceInit}ms > ${GRACE_PERIOD_MS}ms).`
        );
      }
    }

    return false;
  }
}
