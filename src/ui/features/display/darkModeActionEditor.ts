import { BinaryStateActionEditor } from '../../components/binaryStateActionEditor.js';

export class DarkModeActionEditor extends BinaryStateActionEditor {
  protected getTitle(): string { return 'Dark Mode'; }
  protected getTrueLabel(): string { return 'Enable'; }
  protected getFalseLabel(): string { return 'Disable'; }
}
