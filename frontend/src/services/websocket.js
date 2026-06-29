import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = 'http://localhost:8081/ws';

/**
 * Thin wrapper around a STOMP-over-SockJS connection to the backend.
 * One shared client; callers subscribe to topics and get a tidy unsubscribe fn.
 */
class MarketSocket {
  constructor() {
    this.client = null;
    this.connected = false;
    this.pending = []; // subscriptions requested before the socket is live
    this.subscriptions = new Map();
  }

  connect() {
    if (this.client) return;

    this.client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        this.connected = true;
        // flush any subscriptions requested before connect finished
        this.pending.forEach(({ topic, cb }) => this._subscribe(topic, cb));
        this.pending = [];
      },
      onWebSocketClose: () => { this.connected = false; },
    });

    this.client.activate();
  }

  _subscribe(topic, cb) {
    const sub = this.client.subscribe(topic, (message) => {
      try {
        cb(JSON.parse(message.body));
      } catch (e) {
        console.error('[ws] bad message on', topic, e);
      }
    });
    this.subscriptions.set(topic, sub);
  }

  /** Subscribe to a topic. Returns an unsubscribe function. */
  subscribe(topic, cb) {
    this.connect();
    if (this.connected) {
      this._subscribe(topic, cb);
    } else {
      this.pending.push({ topic, cb });
    }
    return () => this.unsubscribe(topic);
  }

  unsubscribe(topic) {
    const sub = this.subscriptions.get(topic);
    if (sub) {
      sub.unsubscribe();
      this.subscriptions.delete(topic);
    }
    this.pending = this.pending.filter((p) => p.topic !== topic);
  }
}

const marketSocket = new MarketSocket();
export default marketSocket;
