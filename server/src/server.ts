import { WebSocket, WebSocketServer } from 'ws';
import {
  parseClientMessage,
  type ClientId,
  type CursorPosition,
  type ParticipantState,
  type RoomId,
  type ServerMessage,
} from '../../shared/protocol.js';

const HEARTBEAT_INTERVAL_MS = 15_000;
const configuredPort = Number(process.env.MULTIPLAYER_SYNC_PORT ?? 8080);
const PORT = Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort <= 65_535
  ? configuredPort
  : 8080;

interface Participant {
  clientId: ClientId;
  ws: WebSocket;
  position: CursorPosition | null;
  lastSequence: number;
  isAlive: boolean;
}

interface Room {
  participants: Map<ClientId, Participant>;
}

const wss = new WebSocketServer({ port: PORT });
const rooms = new Map<RoomId, Room>();

wss.on('connection', (ws) => {
  let roomId: RoomId | null = null;
  let participant: Participant | null = null;

  ws.on('pong', () => {
    if (participant) participant.isAlive = true;
  });

  ws.on('message', (data, isBinary) => {
    if (isBinary) return;

    const message = parseClientMessage(data.toString());
    if (!message) {
      console.warn('Discarded malformed client message');
      return;
    }

    switch (message.type) {
      case 'join': {
        if (participant) {
          // A socket may only claim one identity and room for its lifetime.
          if (participant.clientId !== message.clientId || roomId !== message.roomId) {
            ws.close(1008, 'A connection cannot join multiple identities or rooms');
          }
          return;
        }

        joinRoom(ws, message.roomId, message.clientId, (joinedRoomId, joinedParticipant) => {
          roomId = joinedRoomId;
          participant = joinedParticipant;
        });
        return;
      }

      case 'cursor':
        if (!participant || !roomId) return;
        if (message.sequence <= participant.lastSequence) return;

        participant.position = message.position;
        participant.lastSequence = message.sequence;
        broadcast(roomId, {
          type: 'cursor_update',
          clientId: participant.clientId,
          position: message.position,
          timestamp: message.timestamp,
          sequence: message.sequence,
        }, participant.clientId);
        return;

      case 'react':
        if (!participant || !roomId) return;
        broadcast(roomId, {
          type: 'reaction',
          clientId: participant.clientId,
          reactionId: message.reactionId,
          position: message.position,
        }, participant.clientId);
        return;

      case 'ping':
        send(ws, { type: 'pong', timestamp: message.timestamp });
        return;
    }
  });

  ws.on('close', () => {
    if (roomId && participant) leaveRoom(roomId, participant);
  });

  ws.on('error', (error) => {
    console.warn('WebSocket error:', error.message);
  });
});

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    const participant = findParticipantBySocket(ws);
    if (participant && !participant.isAlive) {
      ws.terminate();
      continue;
    }

    if (participant) participant.isAlive = false;
    ws.ping();
  }
}, HEARTBEAT_INTERVAL_MS);

wss.on('close', () => clearInterval(heartbeat));

console.log(`WebSocket server listening on ws://localhost:${PORT}`);

function joinRoom(
  ws: WebSocket,
  roomId: RoomId,
  clientId: ClientId,
  setConnectionState: (roomId: RoomId, participant: Participant) => void,
) {
  const room = rooms.get(roomId) ?? { participants: new Map<ClientId, Participant>() };
  rooms.set(roomId, room);

  const existing = room.participants.get(clientId);
  const participant: Participant = {
    clientId,
    ws,
    position: existing?.position ?? null,
    lastSequence: existing?.lastSequence ?? -1,
    isAlive: true,
  };

  // Snapshot excludes the joining client because the browser renders its own cursor locally.
  const snapshot = createSnapshot(room, clientId);
  room.participants.set(clientId, participant);
  setConnectionState(roomId, participant);

  send(ws, { type: 'snapshot', participants: snapshot });

  if (existing) {
    // A stable sessionStorage client ID reconnects by replacing, not duplicating, its socket.
    existing.ws.close(4001, 'Replaced by a newer connection');
    return;
  }

  broadcast(roomId, {
    type: 'presence_joined',
    clientId,
    state: toParticipantState(participant),
  }, clientId);
}

function leaveRoom(roomId: RoomId, participant: Participant) {
  const room = rooms.get(roomId);
  // Do not remove a newer socket that replaced this participant during reconnect.
  if (!room || room.participants.get(participant.clientId) !== participant) return;

  room.participants.delete(participant.clientId);
  broadcast(roomId, { type: 'presence_left', clientId: participant.clientId });

  if (room.participants.size === 0) rooms.delete(roomId);
}

function createSnapshot(room: Room, excludedClientId: ClientId): Record<ClientId, ParticipantState> {
  const snapshot: Record<ClientId, ParticipantState> = {};

  for (const [clientId, participant] of room.participants) {
    if (clientId !== excludedClientId) snapshot[clientId] = toParticipantState(participant);
  }

  return snapshot;
}

function toParticipantState(participant: Participant): ParticipantState {
  return {
    position: participant.position,
    lastSequence: Math.max(0, participant.lastSequence),
  };
}

function broadcast(roomId: RoomId, event: ServerMessage, excludedClientId?: ClientId) {
  const room = rooms.get(roomId);
  if (!room) return;

  for (const [clientId, participant] of room.participants) {
    if (clientId !== excludedClientId) send(participant.ws, event);
  }
}

function send(ws: WebSocket, event: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event));
}

function findParticipantBySocket(ws: WebSocket): Participant | undefined {
  for (const room of rooms.values()) {
    for (const participant of room.participants.values()) {
      if (participant.ws === ws) return participant;
    }
  }

  return undefined;
}
