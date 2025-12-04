import { BinaryStateActionEditor } from '../../components/binaryStateActionEditor.js';

export class BluetoothActionEditor extends BinaryStateActionEditor {
  protected getTitle(): string { return 'Bluetooth'; }
  protected getTrueLabel(): string { return 'Turn On'; }
  protected getFalseLabel(): string { return 'Turn Off'; }
}
