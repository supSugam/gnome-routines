
// @ts-ignore
import GLib from 'gi://GLib';
// @ts-ignore
import Gio from 'gi://Gio';

import { BaseTrigger } from './base.js';
import { TriggerType, StartupTriggerConfig, TriggerStrategy } from '../types.js';
import debugLog from '../../utils/log.js';

export class StartupTrigger extends BaseTrigger {
  constructor(id: string, config: StartupTriggerConfig) {
    super(id, TriggerType.STARTUP, config, TriggerStrategy.STATE_PERSISTENT);
  }

  async check(): Promise<boolean> {
    const runtimeDir = GLib.get_user_runtime_dir();
    const lockFilePath = GLib.build_filenamev([runtimeDir, 'gnome-routines-startup.lock']);
    const file = Gio.File.new_for_path(lockFilePath);

    if (file.query_exists(null)) {
        debugLog('[StartupTrigger] Lock file exists, skipping startup trigger');
        return false;
    }

    try {
        const outputStream = file.create(Gio.FileCreateFlags.NONE, null);
        const encoder = new TextEncoder();
        const content = encoder.encode(new Date().toISOString());
        outputStream.write_all(content, null);
        outputStream.close(null);
        debugLog('[StartupTrigger] Created lock file, activating startup trigger');
        return true;
    } catch (e) {
        console.error('[StartupTrigger] Failed to create lock file:', e);
        return false;
    }
  }
}
