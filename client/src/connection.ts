import type { ClientId, ClientMessage, CursorPosition, RoomId } from '../../shared/protocol';

const CLIENT_ID_STORAGE_KEY = 'multiplayer-sync.client-id';
const CURSOR_SEQUENCE_STORAGE_KEY = 'multiplayer-sync.cursor-sequence';

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

export function createJoinMessage(roomId: RoomId): ClientMessage {
  return { type: 'join', roomId, clientId: getOrCreateClientId() };
}

function nextCursorSequence(): number {
  const stored = Number(sessionStorage.getItem(CURSOR_SEQUENCE_STORAGE_KEY));
  const previous = Number.isSafeInteger(stored) && stored >= 0 ? stored : 0;
  const sequence = previous + 1;
  sessionStorage.setItem(CURSOR_SEQUENCE_STORAGE_KEY, String(sequence));
  return sequence;
}

/**
 * Coalesces pointer movement to the most recent coordinate and emits no more than
 * one cursor message per delay window (use 40 ms for a 25 Hz update rate).
 */
export function createThrottledSender(ws: WebSocket, delayMs: number) {
  let lastSentAt = 0;
  let pendingPosition: CursorPosition | null = null;
  let timeoutId: number | null = null;

  const sendPending = () => {
    timeoutId = null;
    if (!pendingPosition || ws.readyState !== WebSocket.OPEN) return;

    const message: ClientMessage = {
      type: 'cursor',
      position: pendingPosition,
      timestamp: Date.now(),
      sequence: nextCursorSequence(),
    };

    ws.send(JSON.stringify(message));
    pendingPosition = null;
    lastSentAt = message.timestamp;
  };

  return (position: CursorPosition) => {
    pendingPosition = position;
    const elapsed = Date.now() - lastSentAt;

    if (elapsed >= delayMs) {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      sendPending();
      return;
    }

    if (timeoutId === null) {
      timeoutId = window.setTimeout(sendPending, delayMs - elapsed);
    }
  };
}
