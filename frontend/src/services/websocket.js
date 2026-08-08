import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = 'http://localhost:8081/ws';

/**
 * Thin wrapper around a STOMP-over-SockJS connection to the backend.
 * One shared client; callers subscribe to topics and get a tidy unsubscribe fn.
 * Handlers survive reconnects: STOMP subs are re-established on every onConnect.
 */
class MarketSocket {
  constructor() {
    this.client = null;
    this.connected = false;
    this.handlers = new Map(); // topic -> Set of callbacks (survives reconnects)
    this.stompSubs = new Map(); // topic -> active STOMP subscription
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
        // old subs belong to the dead session; re-subscribe everything
        this.stompSubs.clear();
        this.handlers.forEach((_cbs, topic) => this._subscribe(topic));
      },
      onWebSocketClose: () => { this.connected = false; },
    });

    this.client.activate();
  }

  _subscribe(topic) {
    const sub = this.client.subscribe(topic, (message) => {
      let data;
      try {
        data = JSON.parse(message.body);
      } catch (e) {
        console.error('[ws] bad message on', topic, e);
        return;
      }
      const cbs = this.handlers.get(topic);
      if (!cbs) return;
      cbs.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error('[ws] bad message on', topic, e);
        }
      });
    });
    this.stompSubs.set(topic, sub);
  }

  /** Subscribe to a topic. Returns an unsubscribe function. */
  subscribe(topic, cb) {
    let cbs = this.handlers.get(topic);
    if (!cbs) {
      cbs = new Set();
      this.handlers.set(topic, cbs);
    }
    cbs.add(cb);

    this.connect();
    if (this.connected && !this.stompSubs.has(topic)) {
      this._subscribe(topic);
    }

    return () => {
      const set = this.handlers.get(topic);
      if (!set) return;
      set.delete(cb);
      if (set.size === 0) {
        const sub = this.stompSubs.get(topic);
        if (sub) sub.unsubscribe();
        this.stompSubs.delete(topic);
        this.handlers.delete(topic);
      }
    };
  }
}

const marketSocket = new MarketSocket();
export default marketSocket;
