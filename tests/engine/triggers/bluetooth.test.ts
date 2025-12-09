
import { BluetoothTrigger } from '../../../src/engine/triggers/bluetooth';
import { ConnectionState } from '../../../src/engine/types';
import { MockSystemAdapter } from '../../mocks/adapter.mock';

// Extend MockSystemAdapter to support device simulation
class TestSystemAdapter extends MockSystemAdapter {
  private devices: { name: string; address: string }[] = [];
  private deviceStateCallback?: () => void;

  setConnectedDevices(devices: { name: string; address: string }[]) {
    this.devices = devices;
  }

  // Override
  async getConnectedBluetoothDevices(): Promise<{ name: string; address: string }[]> {
    return this.devices;
  }

  onBluetoothDeviceStateChanged(callback: () => void): void {
    this.deviceStateCallback = callback;
  }

  simulateDeviceStateChange() {
    if (this.deviceStateCallback) {
      this.deviceStateCallback();
    }
  }
}

describe('BluetoothTrigger', () => {
  let adapter: TestSystemAdapter;

  beforeEach(() => {
    adapter = new TestSystemAdapter();
  });

  const flushPromises = () => new Promise(resolve => setImmediate(resolve));

  test('should NOT trigger on init if condition is already met (Initial Ignore)', async () => {
    // Setup: Device already connected
    adapter.setConnectedDevices([{ name: 'Headphones', address: '00:00:00:00:00:00' }]);

    const trigger = new BluetoothTrigger(
      'test-1',
      { state: ConnectionState.CONNECTED },
      adapter
    );

    const triggerSpy = jest.fn();
    (trigger as any).on('triggered', triggerSpy);

    trigger.activate();
    await flushPromises(); // Allow init to complete

    expect(triggerSpy).not.toHaveBeenCalled();
  });

  test('should trigger when device connects (False -> True)', async () => {
    // Setup: No devices
    adapter.setConnectedDevices([]);

    const trigger = new BluetoothTrigger(
      'test-2',
      { state: ConnectionState.CONNECTED }, // Trigger when ANY device connects
      adapter
    );

    const triggerSpy = jest.fn();
    (trigger as any).on('triggered', triggerSpy);

    trigger.activate();
    await flushPromises(); // Init (False)

    // Action: Connect device
    adapter.setConnectedDevices([{ name: 'Mouse', address: '11:11:11:11:11:11' }]);
    adapter.simulateDeviceStateChange();
    await flushPromises();

    expect(triggerSpy).toHaveBeenCalledTimes(1);
  });

  test('should NOT trigger on spurious updates if state remains matched (True -> True)', async () => {
    // Setup: Device connected
    adapter.setConnectedDevices([{ name: 'Speaker', address: '22:22' }]);

    const trigger = new BluetoothTrigger(
      'test-3',
      { state: ConnectionState.CONNECTED },
      adapter
    );

    const triggerSpy = jest.fn();
    (trigger as any).on('triggered', triggerSpy);

    trigger.activate();
    await flushPromises(); // Init (True) -> Initial Ignore

    // Action: Another update, still connected
    adapter.simulateDeviceStateChange(); // Maybe signal changed
    await flushPromises();

    expect(triggerSpy).not.toHaveBeenCalled();
  });

  test('should trigger when specific device connects', async () => {
    adapter.setConnectedDevices([]);

    const trigger = new BluetoothTrigger(
      'test-4',
      { 
        state: ConnectionState.CONNECTED,
        deviceIds: ['MyHeadset']
      },
      adapter
    );

    const triggerSpy = jest.fn();
    (trigger as any).on('triggered', triggerSpy);

    trigger.activate();
    await flushPromises();

    // Connect wrong device
    adapter.setConnectedDevices([{ name: 'OtherDevice', address: 'xx' }]);
    adapter.simulateDeviceStateChange();
    await flushPromises();
    expect(triggerSpy).not.toHaveBeenCalled();

    // Connect right device
    adapter.setConnectedDevices([{ name: 'OtherDevice', address: 'xx' }, { name: 'MyHeadset', address: 'yy' }]);
    adapter.simulateDeviceStateChange();
    await flushPromises();
    expect(triggerSpy).toHaveBeenCalledTimes(1);
  });

  test('should handle disconnect -> connect cycle correctly', async () => {
    // Start connected
    adapter.setConnectedDevices([{ name: 'Buds', address: 'aa' }]);
    
    const trigger = new BluetoothTrigger(
      'test-5',
      { state: ConnectionState.CONNECTED },
      adapter
    );
    
    const triggerSpy = jest.fn();
    (trigger as any).on('triggered', triggerSpy);

    trigger.activate();
    await flushPromises(); // Init: True (ignored)

    // Disconnect
    adapter.setConnectedDevices([]);
    adapter.simulateDeviceStateChange();
    await flushPromises();
    // Should NOT trigger because we look for "Connected" (False -> True)
    // Here it went True -> False.
    expect(triggerSpy).not.toHaveBeenCalled();

    // Connect again
    adapter.setConnectedDevices([{ name: 'Buds', address: 'aa' }]);
    adapter.simulateDeviceStateChange();
    await flushPromises();

    // Now it went False -> True. Should Trigger.
    expect(triggerSpy).toHaveBeenCalledTimes(1);
  });
});
