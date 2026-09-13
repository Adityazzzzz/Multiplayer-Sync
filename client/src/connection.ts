import {
  parseServerMessage,
  type ClientId,
  type ClientMessage,
  type CursorPosition,
  type RoomId,
} from '../../shared/protocol';
import { ParticipantStore } from './participantStore';

const CLIENT_ID_STORAGE_KEY = 'multiplayer-sync.client-id';
const CURSOR_SEQUENCE_STORAGE_KEY = 'multiplayer-sync.cursor-sequence';
const CURSOR_SEND_INTERVAL_MS = 40;
const INITIAL_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 8_000;

export interface RoomConnectionOptions {
  roomId: RoomId;
  url?: string;
  clientId?: ClientId;
}

/**
 * Returns a stable identity for this browser tab. sessionStorage preserves it across
 * reconnects and reloads without sharing it with a different tab.
 */
export function getOrCreateClientId(): ClientId {
  const existing = sessionStorage.getItem(CLIENT_ID_STORAGE_KEY);
  if (existing) return existing;

  const clientId = crypto.randomUUID();
  sessionStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId);
  return clientId;
}

/** Raw WebSocket lifecycle, protocol handling, reconnection, and outbound actions. */
export class RoomConnection {
  readonly clientId: ClientId;
  readonly store = new ParticipantStore();

  private readonly roomId: RoomId;
  private readonly url: string;
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private shouldReconnect = true;
  private pendingPosition: CursorPosition | null = null;
  private cursorTimer: number | null = null;
  private lastCursorSentAt = 0;

  constructor({ roomId, url = defaultWebSocketUrl(), clientId = getOrCreateClientId() }: RoomConnectionOptions) {
    this.roomId = roomId;
    this.url = url;
    this.clientId = clientId;
  }

  connect() {
    this.shouldReconnect = true;
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;

    this.store.setConnectionStatus(this.reconnectAttempts === 0 ? 'connecting' : 'reconnecting');
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.addEventListener('open', () => {
      if (this.ws !== ws) return;

      this.reconnectAttempts = 0;
      this.store.setConnectionStatus('connected');
      this.send({ type: 'join', roomId: this.roomId, clientId: this.clientId });
      if (this.pendingPosition) this.flushCursor();
    });

    ws.addEventListener('message', (event) => {
      if (this.ws !== ws || typeof event.data !== 'string') return;

      const message = parseServerMessage(event.data);
      if (message) {
        if (message.type === 'room_created') {
          window.location.href = `/?room=${message.roomId}`;
          return;
        }
        this.store.handleServerMessage(message);
      }
    });

    ws.addEventListener('error', () => {
      // The close handler owns recovery. Browser error events intentionally expose little detail.
    });

    ws.addEventListener('close', () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.clearCursorTimer();

      if (!this.shouldReconnect) {
        this.store.setConnectionStatus('disconnected');
        return;
      }

      this.scheduleReconnect();
    });
  }

  disconnect() {
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    this.clearCursorTimer();

    const ws = this.ws;
    this.ws = null;
    if (ws && ws.readyState < WebSocket.CLOSING) ws.close(1000, 'Client disconnected');
    this.store.setConnectionStatus('disconnected');
  }

  sendCursor(position: CursorPosition) {
    this.pendingPosition = position;
    const elapsed = performance.now() - this.lastCursorSentAt;

    if (elapsed >= CURSOR_SEND_INTERVAL_MS) {
      this.flushCursor();
    } else if (this.cursorTimer === null) {
      this.cursorTimer = window.setTimeout(
        () => this.flushCursor(),
        CURSOR_SEND_INTERVAL_MS - elapsed,
      );
    }
  }

  sendReaction(reactionId: string, position: CursorPosition) {
    const message: ClientMessage = {
      type: 'react',
      reactionId,
      position,
      timestamp: Date.now(),
    };

    if (this.send(message)) this.store.addLocalReaction(reactionId, position, this.clientId);
  }

  ping() {
    this.send({ type: 'ping', timestamp: Date.now() });
  }

  private flushCursor() {
    this.cursorTimer = null;
    if (!this.pendingPosition) return;

    const timestamp = Date.now();
    const message: ClientMessage = {
      type: 'cursor',
      position: this.pendingPosition,
      timestamp,
      sequence: nextCursorSequence(),
    };

    if (this.send(message)) {
      this.pendingPosition = null;
      this.lastCursorSentAt = performance.now();
    }
  }

  send(message: ClientMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(message));
    return true;
  }

  private scheduleReconnect() {
    this.clearReconnectTimer();
    this.reconnectAttempts += 1;
    const exponentialDelay = Math.min(
      INITIAL_RECONNECT_DELAY_MS * 2 ** (this.reconnectAttempts - 1),
      MAX_RECONNECT_DELAY_MS,
    );
    const jitteredDelay = exponentialDelay * (0.8 + Math.random() * 0.4);
    this.store.setConnectionStatus('reconnecting');
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, jitteredDelay);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private clearCursorTimer() {
    if (this.cursorTimer !== null) window.clearTimeout(this.cursorTimer);
    this.cursorTimer = null;
  }
}

function nextCursorSequence(): number {
  const stored = Number(sessionStorage.getItem(CURSOR_SEQUENCE_STORAGE_KEY));
  const previous = Number.isSafeInteger(stored) && stored >= 0 ? stored : 0;
  const sequence = previous + 1;
  sessionStorage.setItem(CURSOR_SEQUENCE_STORAGE_KEY, String(sequence));
  return sequence;
}

function defaultWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:8080`;
}
