export {}; // make this a module so `declare global` works

declare global {
    var debugLog: (message: string, ...args: any[]) => void;
    const imports: any;
}

