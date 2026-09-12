import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import { ClientEvent, ServerEvent, CursorPosition } from '../../shared/protocol';

const wss = new WebSocketServer({ port: 8080 });
const rooms = new Map<string, Map<string, CursorPosition>>();

wss.on('connection', (ws: WebSocket) => {
  const clientId = randomUUID();
  let currentRoom: string | null = null;

  ws.on('message', (data: string) => {
    try {
      const message = JSON.parse(data) as ClientEvent;

      switch (message.type) {
        case 'join':
          currentRoom = message.roomId;
          if (!rooms.has(currentRoom)) rooms.set(currentRoom, new Map());
          
          const room = rooms.get(currentRoom)!;
          room.set(clientId, { x: 0, y: 0 });
          
          // Send current state to the new client
          const syncMessage: ServerEvent = { 
            type: 'sync_state', 
            clients: Object.fromEntries(room) 
          };
          ws.send(JSON.stringify(syncMessage));
          
          // Broadcast join to others
          broadcast(currentRoom, { type: 'client_joined', clientId }, clientId);
          break;

        case 'cursor':
          if (currentRoom) {
            rooms.get(currentRoom)?.set(clientId, message.position);
            broadcast(currentRoom, { 
              type: 'cursor_update', 
              clientId, 
              position: message.position, 
              timestamp: message.timestamp 
            }, clientId);
          }
          break;
          
        case 'react':
            if (currentRoom) {
               broadcast(currentRoom, {
                   type: 'reaction_trigger',
                   clientId,
                   reactionId: message.reactionId,
                   position: message.position
               }, clientId);
            }
            break;
      }
    } catch (err) {
      console.error('Malformed message discarded');
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      rooms.get(currentRoom)?.delete(clientId);
      broadcast(currentRoom, { type: 'client_left', clientId }, clientId);
      if (rooms.get(currentRoom)?.size === 0) rooms.delete(currentRoom);
    }
  });
});

function broadcast(roomId: string, event: ServerEvent, excludeId?: string) {
    const payload = JSON.stringify(event);
}