import debugLog from '../../utils/log.js';
import { StorageAdapter } from '../../engine/storage.js';
import { Routine } from '../../engine/types.js';
// @ts-ignore
import Gio from 'gi://Gio';

export class GSettingsStorageAdapter implements StorageAdapter {
  private settings: any;

  constructor(settings: any) {
    this.settings = settings;
  }

  async saveRoutines(routines: Routine[]): Promise<void> {
    const json = JSON.stringify(routines);
    this.settings.set_string('routines', json);
  }

  async loadRoutines(): Promise<Routine[]> {
    const json = this.settings.get_string('routines');
    debugLog(`[GSettingsStorageAdapter] Raw JSON from settings: ${json}`);
    try {
      const parsed = JSON.parse(json);
      debugLog(`[GSettingsStorageAdapter] Parsed ${parsed.length} routines`);
      return parsed;
    } catch (e) {
      console.error('Failed to parse routines from GSettings:', e);
      return [];
    }
  }
}
