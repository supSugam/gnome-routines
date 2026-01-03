// @ts-ignore
import Gio from 'gi://Gio';
import debugLog from '../../../utils/log.js';
import { getMixerControl } from '../../utils/mixer.js';

export class AudioAdapter {
  private _mixer: any;

  constructor() {
    this._mixer = getMixerControl();
  }

  private _ensureMixerReady(): Promise<void> {
    if (this._mixer.get_state() === 1) {
      // 1 = Gvc.MixerControlState.READY
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      // We might want a timeout here, but usually it connects quickly
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
    debugLog('[AudioAdapter] Subscribing to Gvc headphone changes');

    const checkHeadphones = async () => {
      const state = await this.getWiredHeadphonesState();
      callback(state);
    };

    const idDefault = this._mixer.connect(
      'default-sink-changed',
      checkHeadphones
    );
    const idStream = this._mixer.connect('stream-changed', () => {
      checkHeadphones();
    });

    return () => {
      try {
        this._mixer.disconnect(idDefault);
        this._mixer.disconnect(idStream);
      } catch (e) {
        debugLog('[AudioAdapter] Error disconnecting Gvc signals:', e);
      }
    };
  }
}
