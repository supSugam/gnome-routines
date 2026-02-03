// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import GLib from 'gi://GLib';
import debugLog from '../../../utils/log.js';
import { getMixerControl } from '../../utils/mixer.js';
import { GObjectSignalDispatcher } from '../../utils/signalDispatcher.js';

export class AudioAdapter {
  private _mixer: any;
  private _headphoneDispatcher: GObjectSignalDispatcher<
    (isConnected: boolean) => void
  > | null = null;

  private _enforcementSignalIds: Map<any, number> = new Map();
  private _enforcementTimeoutId: number | null = null;

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

  enforceVolume(percentage: number, durationMs: number): void {
    debugLog(
      `[AudioAdapter] Starting volume enforcement: ${percentage}% for ${durationMs}ms`
    );

    // Clear existing enforcement if any
    this._stopEnforcement();

    const applyToSink = (stream: any) => {
      const max = this._mixer.get_vol_max_norm();
      const vol = Math.floor((percentage / 100) * max);

      if (Math.abs(stream.volume - vol) > max * 0.02) {
        debugLog(
          `[AudioAdapter] Enforcing volume on sink: ${stream.get_name()}`
        );
        stream.volume = vol;
        stream.push_volume();

        if (stream.is_muted) stream.change_is_muted(false);
      }
    };

    const attachToSink = (stream: any) => {
      const port = stream.get_port();
      const isBluetooth =
        stream.get_icon_name().includes('bluetooth') ||
        (port && port.port.includes('bluetooth'));

      if (isBluetooth) {
        applyToSink(stream);

        // Listen for volume changes on this sink
        if (!this._enforcementSignalIds.has(stream)) {
          const id = stream.connect('notify::volume', () =>
            applyToSink(stream)
          );

          this._enforcementSignalIds.set(stream, id);
        }
      }
    };

    // 1. Check existing sinks
    const sinks = this._mixer.get_sinks();

    sinks.forEach((s: any) => attachToSink(s));

    // 2. Listen for new sinks (e.g. slow BT handshake)
    const streamAddedId = this._mixer.connect(
      'stream-added',
      (_: any, id: number) => {
        const stream = this._mixer.lookup_stream_id(id);

        if (stream) attachToSink(stream);
      }
    );

    this._enforcementSignalIds.set(this._mixer, streamAddedId);

    // 3. Stop after duration
    this._enforcementTimeoutId = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      durationMs,
      () => {
        this._stopEnforcement();
        debugLog('[AudioAdapter] Volume enforcement period ended');

        return GLib.SOURCE_REMOVE;
      }
    );
  }

  private _stopEnforcement(): void {
    if (this._enforcementTimeoutId) {
      GLib.source_remove(this._enforcementTimeoutId);
      this._enforcementTimeoutId = null;
    }

    for (const [obj, id] of this._enforcementSignalIds.entries()) {
      try {
        obj.disconnect(id);
      } catch (_e) {
        // Object might be gone
      }
    }

    this._enforcementSignalIds.clear();
  }
}
