/**
 * The single wire contract shared by the browser and WebSocket server.
 * Every received payload must pass the corresponding parser before use.
 */

export type ClientId = string;
export type RoomId = string;

export interface CursorPosition {
  x: number;
  y: number;
}

/** Client -> server messages. */
export type ClientMessage =
  | { type: 'create_room' }
  | { type: 'join'; roomId: RoomId; clientId: ClientId }
  | { type: 'cursor'; position: CursorPosition; timestamp: number; sequence: number }
  | { type: 'react'; reactionId: string; position: CursorPosition; timestamp: number }
  | { type: 'ping'; timestamp: number };

export interface ParticipantState {
  displayName: string;
  /** Null until the participant has sent its first cursor update. */
  position: CursorPosition | null;
  /** The newest cursor sequence accepted by the server for this participant. */
  lastSequence: number;
}

/** Server -> client messages. */
export type ServerMessage =
  | { type: 'room_created'; roomId: RoomId }
  | { type: 'welcome'; clientId: ClientId; participant: ParticipantState }
  | { type: 'snapshot'; participants: Record<ClientId, ParticipantState> }
  | { type: 'presence_joined'; clientId: ClientId; state: ParticipantState }
  | { type: 'presence_left'; clientId: ClientId }
  | {
      type: 'cursor_update';
      clientId: ClientId;
      position: CursorPosition;
      timestamp: number;
      sequence: number;
    }
  | { type: 'reaction'; clientId: ClientId; reactionId: string; position: CursorPosition }
  | { type: 'pong'; timestamp: number };

const MAX_ID_LENGTH = 128;
const MAX_REACTION_ID_LENGTH = 64;
const MAX_COORDINATE = 1_000_000;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isSequence(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function isCursorPosition(value: unknown): value is CursorPosition {
  if (!isRecord(value)) return false;

  return (
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Math.abs(value.x) <= MAX_COORDINATE &&
    Math.abs(value.y) <= MAX_COORDINATE
  );
}

export function isParticipantState(value: unknown): value is ParticipantState {
  if (
    !isRecord(value) ||
    !isSequence(value.lastSequence) ||
    !isNonEmptyString(value.displayName, MAX_ID_LENGTH)
  ) return false;

  return value.position === null || isCursorPosition(value.position);
}

/** Returns true only for a complete, known client-to-server message. */
export function isValidClientMessage(value: unknown): value is ClientMessage {
  if (!isRecord(value) || typeof value.type !== 'string') return false;

  switch (value.type) {
    case 'create_room':
      return true;

    case 'join':
      return (
        isNonEmptyString(value.roomId, MAX_ID_LENGTH) &&
        isNonEmptyString(value.clientId, MAX_ID_LENGTH)
      );

    case 'cursor':
      return (
        isCursorPosition(value.position) &&
        isTimestamp(value.timestamp) &&
        isSequence(value.sequence)
      );

    case 'react':
      return (
        isNonEmptyString(value.reactionId, MAX_REACTION_ID_LENGTH) &&
        isCursorPosition(value.position) &&
        isTimestamp(value.timestamp)
      );

    case 'ping':
      return isTimestamp(value.timestamp);

    default:
      return false;
  }
}

/** Returns true only for a complete, known server-to-client message. */
export function isValidServerMessage(value: unknown): value is ServerMessage {
  if (!isRecord(value) || typeof value.type !== 'string') return false;

  switch (value.type) {
    case 'room_created':
      return isNonEmptyString(value.roomId, MAX_ID_LENGTH);

    case 'welcome':
      return isNonEmptyString(value.clientId, MAX_ID_LENGTH) && isParticipantState(value.participant);

    case 'snapshot':
      if (!isRecord(value.participants)) return false;
      return Object.entries(value.participants).every(
        ([clientId, state]) => isNonEmptyString(clientId, MAX_ID_LENGTH) && isParticipantState(state),
      );

    case 'presence_joined':
      return isNonEmptyString(value.clientId, MAX_ID_LENGTH) && isParticipantState(value.state);

    case 'presence_left':
      return isNonEmptyString(value.clientId, MAX_ID_LENGTH);

    case 'cursor_update':
      return (
        isNonEmptyString(value.clientId, MAX_ID_LENGTH) &&
        isCursorPosition(value.position) &&
        isTimestamp(value.timestamp) &&
        isSequence(value.sequence)
      );

    case 'reaction':
      return (
        isNonEmptyString(value.clientId, MAX_ID_LENGTH) &&
        isNonEmptyString(value.reactionId, MAX_REACTION_ID_LENGTH) &&
        isCursorPosition(value.position)
      );

    case 'pong':
      return isTimestamp(value.timestamp);

    default:
      return false;
  }
}

function parseMessage<T>(raw: string, isValid: (value: unknown) => value is T): T | null {
  try {
    const value: unknown = JSON.parse(raw);
    return isValid(value) ? value : null;
  } catch {
    return null;
  }
}

/** Parses untrusted browser input without allowing malformed JSON to throw. */
export function parseClientMessage(raw: string): ClientMessage | null {
  return parseMessage(raw, isValidClientMessage);
}

/** Parses untrusted server input without allowing malformed JSON to throw. */
export function parseServerMessage(raw: string): ServerMessage | null {
  return parseMessage(raw, isValidServerMessage);
}
