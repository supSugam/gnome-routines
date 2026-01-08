// @ts-ignore
import debugLog from '../../utils/log.js';

/** SignalDispatcher: Shared D-Bus signals */
export class SignalDispatcher<T extends (...args: any[]) => void> {
  private callbacks: Set<T> = new Set();
  private signalId: number | null = null;
  private isSubscribed: boolean = false;

  // Subscription factory
  private subscribeFactory: (dispatch: T) => number;
  private unsubscribeFactory: (signalId: number) => void;
  private name: string;

  constructor(
    name: string,
    subscribeFactory: (dispatch: T) => number,
    unsubscribeFactory: (signalId: number) => void
  ) {
    this.name = name;
    this.subscribeFactory = subscribeFactory;
    this.unsubscribeFactory = unsubscribeFactory;
  }

  /** Add callback */
  addCallback(callback: T): () => void {
    this.callbacks.add(callback);

    // Subscribe on first callback
    if (!this.isSubscribed) {
      this.subscribe();
    }

    debugLog(
      `[SignalDispatcher:${this.name}] Callback added. Total: ${this.callbacks.size}`
    );

    // Cleanup
    return () => {
      this.removeCallback(callback);
    };
  }

  private removeCallback(callback: T): void {
    this.callbacks.delete(callback);
    debugLog(
      `[SignalDispatcher:${this.name}] Callback removed. Total: ${this.callbacks.size}`
    );

    // Unsubscribe last
    if (this.callbacks.size === 0 && this.isSubscribed) {
      this.unsubscribe();
    }
  }

  private subscribe(): void {
    if (this.isSubscribed) return;

    try {
      // Fan-out dispatch
      const dispatchFn = ((...args: any[]) => {
        for (const callback of this.callbacks) {
          try {
            callback(...args);
          } catch (e) {
            debugLog(`[SignalDispatcher:${this.name}] Callback error:`, e);
          }
        }
      }) as T;

      this.signalId = this.subscribeFactory(dispatchFn);
      this.isSubscribed = true;
      debugLog(
        `[SignalDispatcher:${this.name}] Subscribed (id: ${this.signalId})`
      );
    } catch (e) {
      debugLog(`[SignalDispatcher:${this.name}] Subscribe failed:`, e);
    }
  }

  private unsubscribe(): void {
    if (!this.isSubscribed || this.signalId === null) return;

    try {
      this.unsubscribeFactory(this.signalId);
      debugLog(
        `[SignalDispatcher:${this.name}] Unsubscribed (id: ${this.signalId})`
      );
    } catch (e) {
      debugLog(`[SignalDispatcher:${this.name}] Unsubscribe failed:`, e);
    }

    this.signalId = null;
    this.isSubscribed = false;
  }

  /** Force cleanup */
  destroy(): void {
    this.callbacks.clear();
    this.unsubscribe();
  }

  /** Get current callback count */
  get size(): number {
    return this.callbacks.size;
  }
}

/** GObjectSignalDispatcher */
export class GObjectSignalDispatcher<T extends (...args: any[]) => void> {
  private callbacks: Set<T> = new Set();
  private signalId: number | null = null;
  private isConnected: boolean = false;

  private object: any;
  private signalName: string;
  private name: string;

  constructor(name: string, object: any, signalName: string) {
    this.name = name;
    this.object = object;
    this.signalName = signalName;
  }

  addCallback(callback: T): () => void {
    this.callbacks.add(callback);

    if (!this.isConnected) {
      this.connect();
    }

    debugLog(
      `[GObjectDispatcher:${this.name}] Callback added. Total: ${this.callbacks.size}`
    );

    return () => {
      this.removeCallback(callback);
    };
  }

  private removeCallback(callback: T): void {
    this.callbacks.delete(callback);
    debugLog(
      `[GObjectDispatcher:${this.name}] Callback removed. Total: ${this.callbacks.size}`
    );

    if (this.callbacks.size === 0 && this.isConnected) {
      this.disconnect();
    }
  }

  private connect(): void {
    if (this.isConnected) return;

    try {
      this.signalId = this.object.connect(this.signalName, (...args: any[]) => {
        for (const callback of this.callbacks) {
          try {
            callback(...args);
          } catch (e) {
            debugLog(`[GObjectDispatcher:${this.name}] Callback error:`, e);
          }
        }
      });
      this.isConnected = true;
      debugLog(
        `[GObjectDispatcher:${this.name}] Connected to '${this.signalName}'`
      );
    } catch (e) {
      debugLog(`[GObjectDispatcher:${this.name}] Connect failed:`, e);
    }
  }

  private disconnect(): void {
    if (!this.isConnected || this.signalId === null) return;

    try {
      this.object.disconnect(this.signalId);
      debugLog(
        `[GObjectDispatcher:${this.name}] Disconnected from '${this.signalName}'`
      );
    } catch (e) {
      debugLog(`[GObjectDispatcher:${this.name}] Disconnect failed:`, e);
    }

    this.signalId = null;
    this.isConnected = false;
  }

  destroy(): void {
    this.callbacks.clear();
    this.disconnect();
  }

  get size(): number {
    return this.callbacks.size;
  }
}
