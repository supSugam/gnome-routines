import { Trigger, TriggerType, TriggerStrategy } from '../types.js';
import { EventEmitter } from '../events.js';
import { TRIGGER_METADATA } from '../triggerMetadata.js';

export abstract class BaseTrigger extends EventEmitter implements Trigger {
  id: string;
  type: TriggerType;
  config: Record<string, any>;
  isActive: boolean = false;
  strategy?: TriggerStrategy; // Defined in types

  constructor(
    id: string,
    type: TriggerType,
    config: Record<string, any>,
    strategy?: TriggerStrategy
  ) {
    super();
    this.id = id;
    this.type = type;
    this.config = config;
    
    const metadata = TRIGGER_METADATA[type];
    if (metadata?.getStrategy) {
      this.strategy = strategy || metadata.getStrategy(config);
    } else {
      this.strategy = strategy || metadata?.defaultStrategy;
    }
  }

  abstract check(): Promise<boolean> | boolean;

  // @ts-ignore
  on(event: 'activate' | 'deactivate', callback: () => void): void {
    super.on(event, callback);
  }

  protected setActive(active: boolean) {
    if (this.isActive !== active) {
      this.isActive = active;
      this.emit(active ? 'activate' : 'deactivate');
    }
  }
}
