import { Routine, RoutineExport, RoutineExportData } from './types.js';
import debugLog from '../utils/log.js';

// @ts-ignore
import GLib from 'gi://GLib';

export class ImportExportManager {
  static exportRoutines(routines: Routine[]): string {
    try {
      const exportData: RoutineExport = {
        version: 2,
        timestamp: Date.now(),
        source: 'gnome-routines',
        routines: routines.map((r) => {
          return {
            name: r.name,
            enabled: r.enabled,
            matchType: r.matchType,
            triggers: r.triggers.map((t) => ({
              id: GLib.uuid_string_random(),
              type: t.type,
              config: t.config,
              strategy: t.strategy,
            })) as any,
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
      debugLog('[ImportExport] Export failed:', e);
      throw e;
    }
  }

  static importRoutines(json: string): Routine[] {
    try {
      const data: RoutineExport = JSON.parse(json);

      if (data.source !== 'gnome-routines') {
        throw new Error('Invalid source');
      }

      return data.routines.map((rData) => {
        const id = GLib.uuid_string_random();

        return {
          id: id,
          name: rData.name,
          enabled: rData.enabled,
          matchType: rData.matchType,
          triggers: rData.triggers,
          actions: rData.actions,
        } as unknown as Routine;
      });
    } catch (e) {
      debugLog('[ImportExport] Import failed:', e);
      throw new Error('Failed to import routines: Invalid format');
    }
  }
}
