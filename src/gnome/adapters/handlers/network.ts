// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import NM from 'gi://NM';
import debugLog from '../../../utils/log.js';

export class NetworkAdapter {
  private _client: any; // NM.Client

  constructor() {
    try {
      this._client = NM.Client.new(null);
    } catch (e) {
      debugLog('[NetworkAdapter] Failed to simple-init NM Client:', e);
      // Async fallback if sync fails? But constructor can't be async.
      // We'll rely on method calls doing their checks.
      NM.Client.new_async(null, (obj: any, result: any) => {
        try {
          this._client = NM.Client.new_finish(result);
          debugLog('[NetworkAdapter] NM Client initialized async');
        } catch (err) {
          debugLog('[NetworkAdapter] NM Client async init failed:', err);
        }
      });
    }
  }

  private _ensureClient(): any {
    if (!this._client) {
      try {
        this._client = NM.Client.new(null);
      } catch (e) {
        // If sync new() fails, we might be in a context where it's not allowed?
        // But usually we just return what we have.
        debugLog('[NetworkAdapter] Warning: NM Client re-init attempted');
      }
    }
    return this._client;
  }

  setWifi(enabled: boolean): void {
    const client = this._ensureClient();
    if (client) {
      debugLog(`[NetworkAdapter] Setting WiFi enabled: ${enabled}`);
      client.wireless_enabled = enabled;
    }
  }

  connectToWifi(ssid: string): void {
    const client = this._ensureClient();
    if (!client) return;

    client.activate_connection_async(
      null,
      null,
      null,
      null,
      (client: any, result: any) => {
        // Logic for connection is complex in NM (need device/access point).
        // Reusing simplified logic or placeholder from original adapter.
        // The original code iterated connections to find matching SSID.
        try {
          const connections = client.get_connections();
          for (const conn of connections) {
            const s_wireless = conn.get_setting_wireless();
            if (s_wireless && s_wireless.get_ssid()) {
              const ssidBytes = s_wireless.get_ssid();
              let connSsid = '';
              if (ssidBytes) {
                const data = ssidBytes.get_data();
                if (data) {
                  const decoder = new TextDecoder('utf-8');
                  connSsid = decoder.decode(new Uint8Array(data));
                }
              }

              if (connSsid === ssid) {
                debugLog(
                  `[NetworkAdapter] Found connection for ${ssid}, activating...`
                );

                // Find compatible device
                const devices = client.get_devices();
                let device = null;
                for (const dev of devices) {
                  if (dev.device_type === NM.DeviceType.WIFI) {
                    device = dev;
                    break;
                  }
                }

                if (device) {
                  client.activate_connection_async(
                    conn,
                    device,
                    null,
                    null,
                    (c: any, res: any) => {
                      try {
                        c.activate_connection_finish(res);
                        debugLog(
                          `[NetworkAdapter] Activated connection for ${ssid}`
                        );
                      } catch (e) {
                        debugLog(
                          `[NetworkAdapter] Failed to activate connection: ${e}`
                        );
                      }
                    }
                  );
                }
                return;
              }
            }
          }

          debugLog(
            `[NetworkAdapter] No saved connection found for SSID: ${ssid}`
          );
        } catch (e) {
          debugLog('[NetworkAdapter] Error connecting to WiFi:', e);
        }
      }
    );
  }

  getWifiState(): boolean {
    // Returns whether WiFi is CONNECTED to a network (not just powered on)
    const client = this._ensureClient();
    if (!client) return false;

    // Check if there's an active WiFi connection
    const ssid = this.getCurrentWifiSSID();
    return ssid !== null;
  }

  getWifiPowerState(): boolean {
    // Returns whether WiFi radio is enabled
    const client = this._ensureClient();
    return client ? client.wireless_enabled : false;
  }

  onWifiStateChanged(callback: (isConnected: boolean) => void): () => void {
    // Monitor connection state changes (connected to network vs not)
    const client = this._ensureClient();
    if (!client) return () => {};

    // Monitor primary connection changes to detect WiFi connect/disconnect
    const id = client.connect('notify::primary-connection', () => {
      const isConnected = this.getCurrentWifiSSID() !== null;
      debugLog(`[NetworkAdapter] WiFi connection changed: ${isConnected}`);
      callback(isConnected);
    });

    // Also monitor active connections
    const id2 = client.connect('notify::active-connections', () => {
      const isConnected = this.getCurrentWifiSSID() !== null;
      debugLog(
        `[NetworkAdapter] Active connections changed, WiFi connected: ${isConnected}`
      );
      callback(isConnected);
    });

    return () => {
      if (this._client) {
        try {
          this._client.disconnect(id);
        } catch (e) {}
        try {
          this._client.disconnect(id2);
        } catch (e) {}
      }
    };
  }

  onWifiPowerStateChanged(callback: (isEnabled: boolean) => void): () => void {
    const client = this._ensureClient();
    if (!client) return () => {};

    const id = client.connect('notify::wireless-enabled', () => {
      const state = client.wireless_enabled;
      debugLog(`[NetworkAdapter] WiFi power state changed: ${state}`);
      callback(state);
    });

    return () => {
      if (this._client) {
        try {
          this._client.disconnect(id);
        } catch (e) {}
      }
    };
  }

  getCurrentWifiSSID(): string | null {
    const client = this._ensureClient();
    if (!client) return null;

    try {
      const activeConn = client.get_primary_connection();
      if (activeConn) {
        const conn = activeConn.get_connection();
        if (conn) {
          const s_wireless = conn.get_setting_wireless();
          if (s_wireless) {
            const ssidBytes = s_wireless.get_ssid();
            if (ssidBytes) {
              // get_ssid() returns GLib.Bytes, need to get the data
              const data = ssidBytes.get_data();
              if (data) {
                // Convert byte array to string
                const decoder = new TextDecoder('utf-8');
                return decoder.decode(new Uint8Array(data));
              }
            }
          }
          // Fallback: use connection ID (usually matches SSID for WiFi)
          return conn.get_id() || null;
        }
      }
    } catch (e: any) {
      debugLog(
        `[NetworkAdapter] Error getting current SSID: ${e?.message || e}`
      );
    }
    return null;
  }

  getSavedWifiNetworks(): string[] {
    const client = this._ensureClient();
    if (!client) return [];
    const networks: string[] = [];
    try {
      const connections = client.get_connections();
      for (const conn of connections) {
        const s_wireless = conn.get_setting_wireless();
        if (s_wireless) {
          const ssidBytes = s_wireless.get_ssid();
          if (ssidBytes) {
            const data = ssidBytes.get_data();
            if (data) {
              const decoder = new TextDecoder('utf-8');
              networks.push(decoder.decode(new Uint8Array(data)));
            }
          }
        }
      }
    } catch (e: any) {
      debugLog(
        `[NetworkAdapter] Error getting saved networks: ${e?.message || e}`
      );
    }
    return networks;
  }

  setAirplaneMode(enabled: boolean): void {
    const client = this._ensureClient();
    if (client) {
      debugLog(
        `[NetworkAdapter] Setting Airplane Mode to: ${enabled} (Radios: ${!enabled})`
      );

      // WiFi
      client.wireless_enabled = !enabled;

      // Mobile Broadband (WWAN)
      if (client.wwan_enabled !== undefined) {
        client.wwan_enabled = !enabled;
      }
    }
  }

  getAirplaneModeState(): boolean {
    const client = this._ensureClient();
    if (!client) {
      debugLog('[NetworkAdapter] No client for airplane mode check');
      return false;
    }
    // In GNOME, airplane mode = WiFi disabled (quick settings toggle)
    const isAirplane = !client.wireless_enabled;
    debugLog(
      `[NetworkAdapter] Airplane mode check: wifi_enabled=${client.wireless_enabled}, result=${isAirplane}`
    );
    return isAirplane;
  }

  onAirplaneModeStateChanged(
    callback: (isEnabled: boolean) => void
  ): () => void {
    const client = this._ensureClient();
    if (!client) {
      debugLog('[NetworkAdapter] No client for airplane mode listener');
      return () => {};
    }

    debugLog('[NetworkAdapter] Subscribing to airplane mode changes');

    // Listen for wireless state changes (GNOME airplane mode)
    const checkAirplaneMode = () => {
      const isAirplane = !client.wireless_enabled;
      debugLog(`[NetworkAdapter] Airplane mode changed: ${isAirplane}`);
      callback(isAirplane);
    };

    const wirelessId = client.connect(
      'notify::wireless-enabled',
      checkAirplaneMode
    );

    return () => {
      try {
        client.disconnect(wirelessId);
        debugLog('[NetworkAdapter] Airplane mode listener disconnected');
      } catch (e) {
        debugLog(
          '[NetworkAdapter] Error disconnecting airplane mode listeners:',
          e
        );
      }
    };
  }
}
