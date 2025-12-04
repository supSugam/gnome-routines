import { BinaryStateActionEditor } from '../../components/binaryStateActionEditor.js';

export class WifiActionEditor extends BinaryStateActionEditor {
  protected getTitle(): string { return 'Wifi'; }
  protected getTrueLabel(): string { return 'Turn On'; }
  protected getFalseLabel(): string { return 'Turn Off'; }
}
