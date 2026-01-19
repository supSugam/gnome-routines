// @ts-ignore
import Gio from 'gi://Gio';
import debugLog from '../../../utils/log.js';
import { getMixerControl } from '../../utils/mixer.js';
import { GObjectSignalDispatcher } from '../../utils/signalDispatcher.js';

export class AudioAdapter {
  private _mixer: any;
  private _headphoneDispatcher: GObjectSignalDispatcher<
    (isConnected: boolean) => void
  > | null = null;

  constructor() {
    this._mixer = getMixerControl();
  }

  private _ensureMixerReady(): Promise<void> {
    if (this._mixer.get_state() === 1) {
      // 1 = Gvc.MixerControlState.READY
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      // No timeout (fast connection)
      const id = this._mixer.connect(
        'state-changed',
        (mixer: any, state: number) => {
          if (state === 1) {
            // READY
            this._mixer.disconnect(id);
            resolve();
          }
        }
      );
    });
  }

  async setVolume(percentage: number): Promise<void> {
    await this._ensureMixerReady();
    const stream = this._mixer.get_default_sink();
    if (!stream) {
      debugLog('[AudioAdapter] No default sink found');
      return;
    }

    debugLog(`[AudioAdapter] Setting volume to: ${percentage}%`);

    // Unmute if muted
    if (stream.is_muted) {
      stream.change_is_muted(false);
    }

    const max = this._mixer.get_vol_max_norm();
    const vol = Math.floor((percentage / 100) * max);

    try {
      stream.volume = vol;
      stream.push_volume();
    } catch (e) {
      debugLog('[AudioAdapter] Failed to set volume via Gvc:', e);
    }
  }

  async getVolume(): Promise<number> {
    await this._ensureMixerReady();
    const stream = this._mixer.get_default_sink();
    if (!stream) return 0;

    const max = this._mixer.get_vol_max_norm();
    const current = stream.volume;
    return Math.round((current / max) * 100);
  }

  async setBluetoothVolume(percentage: number): Promise<boolean> {
    await this._ensureMixerReady();
    const streams = this._mixer.get_sinks();
    let found = false;

    for (const stream of streams) {
      const port = stream.get_port();
      // Heuristic: check icon name or port type
      if (
        stream.get_icon_name().includes('bluetooth') ||
        (port && port.port.includes('bluetooth'))
      ) {
        const max = this._mixer.get_vol_max_norm();
        const vol = Math.floor((percentage / 100) * max);
        stream.volume = vol;
        stream.push_volume();
        if (stream.is_muted) stream.change_is_muted(false);
        found = true;
      }
    }

    return found;
  }

  async getWiredHeadphonesState(): Promise<boolean> {
    await this._ensureMixerReady();
    const stream = this._mixer.get_default_sink();
    if (!stream) return false;

    // Check ports
    const ports = stream.get_ports();
    for (const port of ports) {
      if (port.port === stream.get_port().port) {
        // Active port
        const name = port.port.toLowerCase();
        if (name.includes('headphone') || name.includes('headset')) {
          return true;
        }
      }
    }
    return false;
  }

  onWiredHeadphonesStateChanged(
    callback: (isConnected: boolean) => void
  ): () => void {
    if (!this._headphoneDispatcher) {
      debugLog('[AudioAdapter] Creating shared headphone state dispatcher');
      this._headphoneDispatcher = new GObjectSignalDispatcher(
        'HeadphoneState',
        this._mixer,
        'default-sink-changed'
      );
    }

    // Wrap callback
    const wrappedCallback = () => {
      this.getWiredHeadphonesState().then((state) => {
        callback(state);
      });
    };

    return this._headphoneDispatcher.addCallback(wrappedCallback as any);
  }

  onVolumeChanged(callback: (percentage: number) => void): () => void {
    let streamSignalId: number | null = null;
    let lastStream: any = null;

    const updateVolume = () => {
      const stream = this._mixer.get_default_sink();
      if (!stream) return;
      const max = this._mixer.get_vol_max_norm();
      const current = stream.volume;
      const percentage = Math.round((current / max) * 100);
      callback(percentage);
    };

    const attachToStream = () => {
      if (lastStream && streamSignalId) {
        try {
          lastStream.disconnect(streamSignalId);
        } catch (e) {
          // invalid signal
        }
        streamSignalId = null;
      }

      const stream = this._mixer.get_default_sink();
      lastStream = stream;

      if (stream) {
        streamSignalId = stream.connect('notify::volume', () => {
          updateVolume();
        });
        // Initial call
        updateVolume();
      }
    };

    // Listen to sink changes (e.g. bluetooth connected)
    const sinkDispatcher = new GObjectSignalDispatcher(
      'VolumeMonitor',
      this._mixer,
      'default-sink-changed'
    );

    const cleanup = sinkDispatcher.addCallback(() => {
      attachToStream();
    });

    // Attach initially
    this._ensureMixerReady().then(() => {
      attachToStream();
    });

    return () => {
      cleanup();
      if (lastStream && streamSignalId) {
        try {
          lastStream.disconnect(streamSignalId);
        } catch (e) {}
      }
      sinkDispatcher.destroy();
    };
  }
}
