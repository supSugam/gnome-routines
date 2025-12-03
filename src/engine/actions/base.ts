import { Action } from '../types.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export abstract class BaseAction implements Action {
  id: string;
  type: string;
  config: Record<string, any>;
  onDeactivate?: { type: 'revert' | 'keep' | 'custom'; config?: any };
  protected adapter: SystemAdapter;

  constructor(
    id: string,
    type: string,
    config: Record<string, any>,
    adapter: SystemAdapter
  ) {
    this.id = id;
    this.type = type;
    this.config = config;
    this.adapter = adapter;
  }

  abstract execute(): Promise<void> | void;
  abstract revert?(): Promise<void> | void;
}
