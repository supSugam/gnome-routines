import { BinaryStateActionEditor } from '../../components/binaryStateActionEditor.js';

export class DndActionEditor extends BinaryStateActionEditor {
  protected getTitle(): string {
    return 'Do Not Disturb';
  }
  protected getTrueLabel(): string {
    return 'Enable';
  }
  protected getFalseLabel(): string {
    return 'Disable';
  }

  render(group: any): void {
    if (this.config.enabled === undefined) {
      this.config.enabled = true;
    }
    super.render(group);
  }
}
