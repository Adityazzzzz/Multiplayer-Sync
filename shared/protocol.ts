export type ClientId = string;

export interface CursorPosition {
  x: number;
  y: number;
}

export type ClientEvent = 
  | { type: 'join'; roomId: string }
  | { type: 'cursor'; position: CursorPosition; timestamp: number }
  | { type: 'react'; reactionId: string; position: CursorPosition };

export type ServerEvent = 
  | { type: 'sync_state'; clients: Record<ClientId, CursorPosition> }
  | { type: 'client_joined'; clientId: ClientId }
  | { type: 'client_left'; clientId: ClientId }
  | { type: 'cursor_update'; clientId: ClientId; position: CursorPosition; timestamp: number }
  | { type: 'reaction_trigger'; clientId: ClientId; reactionId: string; position: CursorPosition };