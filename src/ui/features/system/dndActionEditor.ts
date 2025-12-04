import { BinaryStateActionEditor } from '../../components/binaryStateActionEditor.js';

export class DndActionEditor extends BinaryStateActionEditor {
  protected getTitle(): string { return 'Do Not Disturb'; }
  protected getTrueLabel(): string { return 'Enable'; }
  protected getFalseLabel(): string { return 'Disable'; }
}
