// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';

export abstract class BaseEditor {
  protected config: any;
  protected onChange: () => void;

  constructor(config: any, onChange: () => void) {
    this.config = config || {};
    this.onChange = onChange;
  }

  /**
   * Renders the editor UI into the provided group
   */
  abstract render(group: any): void;

  /**
   * Returns the current configuration
   */
  getConfig(): any {
    return this.config;
  }

  /**
   * Validates the configuration.
   * Returns true if valid, or an error message string if invalid.
   */
  abstract validate(): boolean | string;
}
