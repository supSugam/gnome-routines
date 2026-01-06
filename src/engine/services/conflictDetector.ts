import { Routine, ResourceType, ACTION_RESOURCE_MAP } from '../types.js';

/**
 * ConflictDetector - Detects resource conflicts between routines.
 * Single Responsibility: Conflict analysis.
 */
export class ConflictDetector {
  /**
   * Check for resource conflicts between a candidate routine and active routines.
   * Returns names of conflicting routines.
   */
  checkConflicts(candidate: Routine, allRoutines: Iterable<Routine>): string[] {
    const conflicts = new Set<string>();
    const candidateResources = this.getResources(candidate);

    for (const active of allRoutines) {
      if (active.id === candidate.id) continue;
      if (!active.isActive) continue;

      const activeResources = this.getResources(active);

      // Check for resource intersection
      for (const resource of candidateResources) {
        if (activeResources.has(resource)) {
          conflicts.add(active.name);
          break; // Found conflict with this routine
        }
      }
    }

    return Array.from(conflicts);
  }

  /**
   * Get the set of resources that a routine's actions will modify.
   */
  getResources(routine: Routine): Set<ResourceType> {
    const resources = new Set<ResourceType>();

    for (const action of routine.actions) {
      const actionResources = ACTION_RESOURCE_MAP[action.type];
      if (actionResources) {
        actionResources.forEach((r) => resources.add(r));
      }
    }

    return resources;
  }

  /**
   * Check if two routines would conflict based on their resources.
   */
  wouldConflict(r1: Routine, r2: Routine): boolean {
    const resources1 = this.getResources(r1);
    const resources2 = this.getResources(r2);

    for (const resource of resources1) {
      if (resources2.has(resource)) {
        return true;
      }
    }

    return false;
  }
}
