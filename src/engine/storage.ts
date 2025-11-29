import { Routine } from './types.js';

export interface StorageAdapter {
    saveRoutines(routines: Routine[]): Promise<void>;
    loadRoutines(): Promise<Routine[]>;
}
