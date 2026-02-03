export class EventEmitter {
  private events: Record<string, ((...args: any[]) => void)[]> = {};

  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].push(callback);
  }

  off(event: string, callback: (...args: any[]) => void): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter((cb) => cb !== callback);
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return;
    this.events[event].forEach((cb) => cb(...args));
  }
}
