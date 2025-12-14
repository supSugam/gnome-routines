import { BinaryStateTriggerEditor } from '../../components/binaryStateTriggerEditor.js';
import { ConnectionState } from '../../../engine/types.js';

export class DndTriggerEditor extends BinaryStateTriggerEditor {
  protected getTitle(): string {
    return 'Trigger when DND is';
  }
  protected getTrueLabel(): string {
    return 'Enabled';
  }
  protected getFalseLabel(): string {
    return 'Disabled';
  }
  protected getTrueValue(): any {
    return 'on';
  }
  protected getFalseValue(): any {
    return 'off';
  }

  // Ensure initialization happens
  render(group: any): void {
      if (this.config.state === undefined) {
          this.config.state = this.getTrueValue();
      }
      super.render(group);
  }
}
