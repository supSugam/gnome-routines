import { Routine, RoutineExport, RoutineExportData } from './types.js';
import debugLog from '../utils/log.js';

// @ts-ignore
const GLib = imports.gi.GLib;

export class ImportExportManager {
  static exportRoutines(routines: Routine[]): string {
    try {
      const exportData: RoutineExport = {
        version: '1.0.0',
        timestamp: Date.now(),
        source: 'gnome-routines',
        routines: routines.map((r) => {
          // Strict filtering of properties
          return {
            name: r.name,
            enabled: r.enabled,
            matchType: r.matchType,
            triggers: r.triggers.map((t) => ({
              id: GLib.uuid_string_random(), // Regen trigger IDs on export? No, trigger IDs are local to routine. But for export maybe good to have fresh ones or keep logic.
              // Actually, trigger IDs might be referenced? No.
              // Let's keep data clean.
              // Wait, RoutineExportData definition in types.ts used Pick<Routine...>.
              // Routine triggers are Trigger objects (classes). We need their CONFIG.
              // We shouldn't export the Trigger class instance, but the config to recreate it.
              // The Routine interface has `triggers: Trigger[]`.
              // We need to verify if `Trigger` has `config` and `type`. Yes.
              type: t.type,
              config: t.config,
              strategy: t.strategy,
            })) as any, // Type cast because RoutineExportData expects Trigger[] but we are saving config objects really.
            // Wait, RoutineExportData defined in types.ts says `triggers: Trigger[]`.
            // But Trigger includes methods `check`, `on`. We can't export those.
            // We should have defined `RoutineConfig` separate from `Routine` (runtime).
            // For now, I will treat `triggers` in Export as `{type, config, strategy}[]`.
            // I should probably update types.ts to have `RoutineConfig` or `TriggerConfigWrapper`.
            // Or just allow `any` for now and be careful on import implementation.
            actions: r.actions.map((a) => ({
              id: GLib.uuid_string_random(),
              type: a.type,
              config: a.config,
              onDeactivate: a.onDeactivate,
            })),
          };
        }),
      };

      return JSON.stringify(exportData, null, 2);
    } catch (e) {
      console.error('[ImportExport] Export failed:', e);
      throw e;
    }
  }

  static importRoutines(json: string): Routine[] {
    try {
      const data: RoutineExport = JSON.parse(json);

      if (data.source !== 'gnome-routines') {
        throw new Error('Invalid source');
      }

      // Version check (future proofing)
      if (data.version !== '1.0.0') {
        console.warn(
          '[ImportExport] content version is different than supported'
        );
      }

      return data.routines.map((rData) => {
        const id = GLib.uuid_string_random();
        
        // Reconstruct Routine object structure expected by Manager/Triggers
        // We need to map the exported trigger configs back to what `addRoutine` expects.
        // `addRoutine` takes `Routine` interface which demands `Trigger[]`.
        // But `RoutineManager._hydrate` actually expects raw objects and converts them.
        // So passing raw objects here is fine as long as `triggers` array contains {type, config}.
        
        return {
          id: id,
          name: rData.name,
          enabled: rData.enabled, // Import as enabled? Maybe default to false for safety? 
          // User asked for "easy sharing", usually enabled.
          matchType: rData.matchType,
          triggers: rData.triggers, // These are raw configs `{type, config}`
          actions: rData.actions, // Raw action configs
        } as unknown as Routine; 
      });
    } catch (e) {
      console.error('[ImportExport] Import failed:', e);
      throw new Error('Failed to import routines: Invalid format');
    }
  }
}
