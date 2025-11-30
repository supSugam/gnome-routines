// @ts-ignore
import Gio from 'gi://Gio';

export class StateManager {
  private settings: any;
  private states: Map<string, Map<string, any>>;

  constructor() {
    this.settings = new Gio.Settings({
      schema_id: 'org.gnome.shell.extensions.gnome-routines',
    });
    this.states = new Map();
    this.loadStates();
  }

  private loadStates(): void {
    try {
      const json = this.settings.get_string('routine-states');
      if (json) {
        const parsed = JSON.parse(json);
        Object.keys(parsed).forEach((routineId) => {
          const routineStates = new Map<string, any>();
          Object.keys(parsed[routineId]).forEach((key) => {
            routineStates.set(key, parsed[routineId][key]);
          });
          this.states.set(routineId, routineStates);
        });
      }
    } catch (e) {
      console.error('[StateManager] Failed to load states:', e);
    }
  }

  private saveStates(): void {
    try {
      const obj: any = {};
      this.states.forEach((routineStates, routineId) => {
        obj[routineId] = {};
        routineStates.forEach((value, key) => {
          obj[routineId][key] = value;
        });
      });
      this.settings.set_string('routine-states', JSON.stringify(obj));
    } catch (e) {
      console.error('[StateManager] Failed to save states:', e);
    }
  }

  saveState(routineId: string, setting: string, value: any): void {
    if (!this.states.has(routineId)) {
      this.states.set(routineId, new Map());
    }
    const routineStates = this.states.get(routineId)!;
    
    // Only save if not already saved (preserve original state)
    if (!routineStates.has(setting)) {
      routineStates.set(setting, value);
      this.saveStates();
    }
  }

  restoreState(routineId: string, setting: string): any | null {
    const routineStates = this.states.get(routineId);
    if (routineStates) {
      return routineStates.get(setting) ?? null;
    }
    return null;
  }

  clearState(routineId: string): void {
    this.states.delete(routineId);
    this.saveStates();
  }

  hasState(routineId: string, setting: string): boolean {
    const routineStates = this.states.get(routineId);
    return routineStates ? routineStates.has(setting) : false;
  }
}
