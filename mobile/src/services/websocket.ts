import Pusher from 'pusher-js/react-native';
import Echo from 'laravel-echo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import env from '../config/env';

// Make Pusher available globally for Laravel Echo
(window as any).Pusher = Pusher;

// Laravel Echo configuration cho Reverb
// Echo sẽ tự động sử dụng window.Pusher để tạo instance
const getEchoConfig = () => ({
  broadcaster: 'reverb',
  key: env.REVERB_APP_KEY,
  wsHost: env.REVERB_HOST,
  wsPort: env.REVERB_PORT,
  wssPort: env.REVERB_PORT,
  forceTLS: env.REVERB_SCHEME === 'https',
  enabledTransports: ['ws', 'wss'],
  authEndpoint: `${env.API_URL}/broadcasting/auth`,
  // KHÔNG CẦN 'client: Pusher' - Echo sẽ dùng window.Pusher
  auth: {
    headers: {} as any,
  },
});

class WebSocketService {
  private echo: Echo<any> | null = null;
  private pusher: Pusher | null = null;
  private channels: Map<string, any> = new Map();
  private isConnected: boolean = false;

  /**
   * Initialize Laravel Echo connection
   */
  async connect() {
    if (this.echo) {
      console.log('⚠️ WebSocket already connected');
      return this.echo;
    }

    try {
      // Get auth token from storage
      const token = await AsyncStorage.getItem('@auth_token');
      
      console.log('🔑 Token found:', token ? `${token.substring(0, 20)}...` : 'No token');
      
      // Get fresh config
      const config = getEchoConfig();
      
      if (token) {
        config.auth.headers = {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        };
      }

      console.log('🔧 Laravel Echo config:', {
        broadcaster: config.broadcaster,
        key: config.key,
        wsHost: config.wsHost,
        wsPort: config.wsPort,
        forceTLS: config.forceTLS,
        hasPusherClient: !!config.client,
      });

      // Initialize Laravel Echo (NO CLUSTER NEEDED!)
      this.echo = new Echo(config);
      
      console.log('✅ Laravel Echo created successfully');
      
      // DEBUG: Check Echo connector structure
      const connector = (this.echo as any)?.connector;
      console.log('🔍 DEBUG Echo connector:', {
        hasConnector: !!connector,
        connectorKeys: connector ? Object.keys(connector) : [],
        pusherType: typeof connector?.pusher,
      });
      
      // Laravel Echo with Reverb stores the actual Pusher instance differently
      // Try different paths to get the instance
      this.pusher = connector?.pusher?.connection ? connector.pusher : null;
      
      if (!this.pusher && connector?.socket) {
        // Reverb might use 'socket' instead of 'pusher'
        this.pusher = connector.socket;
        console.log('📡 Using connector.socket as Pusher instance');
      }
      
      if (!this.pusher && connector) {
        // Last resort: check all connector properties
        console.log('🔍 Full connector properties:', connector);
        console.warn('⚠️ Cannot find Pusher instance, WebSocket events will not be available');
        return this.echo;
      }
      
      if (!this.pusher) {
        console.error('❌ Pusher instance not available after Echo initialization');
        return this.echo;
      }
      
      console.log('🚀 Pusher instance obtained:', {
        type: typeof this.pusher,
        hasConnection: !!this.pusher.connection,
        connectionState: this.pusher.connection?.state || 'unknown',
      });
      
      // Bind connection events
      this.pusher.connection.bind('connected', () => {
        console.log('✅ WebSocket connected');
        this.isConnected = true;
      });

      this.pusher.connection.bind('connecting', () => {
        console.log('🔄 WebSocket connecting...');
      });

      this.pusher.connection.bind('disconnected', () => {
        console.log('❌ WebSocket disconnected');
        this.isConnected = false;
      });

      this.pusher.connection.bind('unavailable', () => {
        console.log('⚠️ WebSocket unavailable');
        this.isConnected = false;
      });

      this.pusher.connection.bind('failed', () => {
        console.error('💥 WebSocket connection FAILED');
        this.isConnected = false;
      });

      this.pusher.connection.bind('error', (err: any) => {
        console.error('❌ WebSocket error:', err);
        if (err?.error?.data?.code) {
          console.error('Error code:', err.error.data.code);
          console.error('Error message:', err.error.data.message);
        }
        this.isConnected = false;
      });

      this.pusher.connection.bind('state_change', (states: any) => {
        console.log('🔀 Connection state change:', states.previous, '→', states.current);
        
        if (states.current === 'connected') {
          console.log('✅✅✅ KẾT NỐI THÀNH CÔNG!');
        }
        
        if (states.current === 'disconnected') {
          console.log('💔 Ngắt kết nối');
        }
      });

      return this.echo;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      throw error;
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.echo) {
      this.echo.disconnect();
      this.echo = null;
      this.pusher = null;
      this.channels.clear();
      this.isConnected = false;
      console.log('🔌 WebSocket disconnected');
    }
  }

  /**
   * Subscribe to a channel
   */
  subscribe(channelName: string) {
    if (!this.echo) {
      throw new Error('WebSocket not connected. Call connect() first.');
    }

    if (this.channels.has(channelName)) {
      console.log(`⚠️ Already subscribed to ${channelName}`);
      return this.channels.get(channelName);
    }

    console.log(`📡 Subscribing to ${channelName}...`);
    
    // Use Laravel Echo API
    const channel = channelName.startsWith('private-')
      ? this.echo.private(channelName.replace('private-', ''))
      : this.echo.channel(channelName);
    
    this.channels.set(channelName, channel);

    console.log(`✅ Subscribed to ${channelName}`);
    
    // 🔍 DEBUG: Listen to ALL events on this channel
    if (this.pusher) {
      const pusherChannelName = channelName.startsWith('private-') 
        ? `private-${channelName.replace('private-', '')}` 
        : channelName;
      const pusherChannel = this.pusher.channel(pusherChannelName);
      
      if (pusherChannel) {
        pusherChannel.bind_global((eventName: string, data: any) => {
          console.log(`🌍 [${channelName}] Global event:`, eventName);
          console.log(`📦 [${channelName}] Event data:`, data);
        });
      }
    }
    
    return channel;
  }

  /**
   * Subscribe using Pusher API directly (alternative method)
   */
  subscribePusher(channelName: string, eventName: string, callback: (data: any) => void) {
    if (!this.pusher) {
      throw new Error('Pusher not available');
    }

    console.log(`📡 [Pusher] Subscribing to ${channelName}...`);
    
    const channel = this.pusher.subscribe(channelName);
    
    channel.bind('pusher:subscription_succeeded', () => {
      console.log(`✅ [Pusher] Subscribed to ${channelName}`);
    });

    channel.bind('pusher:subscription_error', (error: any) => {
      console.error(`❌ [Pusher] Subscription error on ${channelName}:`, error);
    });
    
    channel.bind(eventName, (data: any) => {
      console.log(`📩 [Pusher] Event ${eventName} received:`, data);
      callback(data);
    });
    
    console.log(`👂 [Pusher] Listening to ${eventName} on ${channelName}`);
    
    this.channels.set(`pusher-${channelName}`, channel);
    
    return channel;
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channelName: string) {
    if (this.channels.has(channelName) && this.echo) {
      this.echo.leave(channelName.replace('private-', ''));
      this.channels.delete(channelName);
      console.log(`🔌 Unsubscribed from ${channelName}`);
    }
  }

  /**
   * Listen to event on a channel.
   * Auto-subscribes if channel not yet registered.
   */
  listen(channelName: string, eventName: string, callback: (data: any) => void) {
    // Auto-subscribe nếu chưa
    if (!this.channels.has(channelName)) {
      this.subscribe(channelName);
    }

    const channel = this.channels.get(channelName);
    if (!channel) {
      console.warn(`[WS] listen: could not get channel "${channelName}"`);
      return;
    }

    // Laravel Echo uses .listen() instead of .bind()
    channel.listen(eventName, callback);
    console.log(`👂 Listening to ${eventName} on ${channelName}`);
  }

  /**
   * Stop listening to event
   */
  stopListening(channelName: string, eventName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.stopListening(eventName);
    }
  }

  /**
   * Check connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export default new WebSocketService();
