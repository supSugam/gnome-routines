export interface Trigger {
    id: string;
    type: string;
    config: Record<string, any>;
    isActive: boolean;
    check(): Promise<boolean> | boolean;
    on(event: 'activate' | 'deactivate', callback: () => void): void;
}

export interface Action {
    id: string;
    type: string;
    config: Record<string, any>;
    execute(): Promise<void> | void;
    revert?(): Promise<void> | void;
}

export interface Routine {
    id: string;
    name: string;
    enabled: boolean;
    matchType: 'any' | 'all';
    triggers: any[]; // Simplified for now to avoid circular deps or complex types
    actions: any[];
    isActive?: boolean; // Runtime state
}

export interface RoutineManagerInterface {
    addRoutine(routine: Routine): void;
    removeRoutine(id: string): void;
    getRoutine(id: string): Routine | undefined;
    evaluate(): void;
}
