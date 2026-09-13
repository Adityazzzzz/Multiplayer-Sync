import type {
  ClientId,
  CursorPosition,
  ParticipantState,
  ServerMessage,
} from '../../shared/protocol';
import { CursorSampleBuffer, type InterpolatedCursor } from './interpolation';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface RemoteParticipant {
  clientId: ClientId;
  lastSequence: number;
  cursor: InterpolatedCursor | null;
}

export interface Reaction {
  clientId: ClientId;
  reactionId: string;
  position: CursorPosition;
  receivedAt: number;
}

interface StoredParticipant {
  clientId: ClientId;
  lastSequence: number;
  samples: CursorSampleBuffer;
}

const MAX_REACTIONS = 50;

/**
 * Transport-independent remote state. Consumers subscribe and take snapshots; no
 * React state or DOM logic lives here.
 */
export class ParticipantStore {
  private readonly participants = new Map<ClientId, StoredParticipant>();
  private readonly listeners = new Set<() => void>();
  private reactions: Reaction[] = [];
  private status: ConnectionStatus = 'disconnected';

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get connectionStatus(): ConnectionStatus {
    return this.status;
  }

  setConnectionStatus(status: ConnectionStatus) {
    if (this.status === status) return;
    this.status = status;
    this.notify();
  }

  handleServerMessage(message: ServerMessage, receivedAt = performance.now()) {
    switch (message.type) {
      case 'snapshot':
        this.participants.clear();
        for (const [clientId, state] of Object.entries(message.participants)) {
          this.addParticipant(clientId, state, receivedAt);
        }
        this.notify();
        return;

      case 'presence_joined':
        this.addParticipant(message.clientId, message.state, receivedAt);
        this.notify();
        return;

      case 'presence_left':
        if (this.participants.delete(message.clientId)) this.notify();
        return;

      case 'cursor_update': {
        const participant = this.participants.get(message.clientId) ?? this.createParticipant(message.clientId);
        if (message.sequence <= participant.lastSequence) return;

        participant.lastSequence = message.sequence;
        participant.samples.push({
          x: message.position.x,
          y: message.position.y,
          sentAt: message.timestamp,
          receivedAt,
        });
        this.notify();
        return;
      }

      case 'reaction':
        this.addReaction({
          clientId: message.clientId,
          reactionId: message.reactionId,
          position: message.position,
          receivedAt,
        });
        return;

      case 'pong':
        return;
    }
  }

  getParticipants(renderedAt = performance.now()): RemoteParticipant[] {
    return Array.from(this.participants.values(), (participant) => ({
      clientId: participant.clientId,
      lastSequence: participant.lastSequence,
      cursor: participant.samples.getPosition(renderedAt),
    }));
  }

  getReactions(): readonly Reaction[] {
    return this.reactions;
  }

  addLocalReaction(reactionId: string, position: CursorPosition, clientId: ClientId) {
    this.addReaction({ clientId, reactionId, position, receivedAt: performance.now() });
  }

  private addParticipant(clientId: ClientId, state: ParticipantState, receivedAt: number) {
    const participant = this.createParticipant(clientId);
    participant.lastSequence = state.lastSequence;
    participant.samples.clear();

    if (state.position) {
      participant.samples.push({ ...state.position, sentAt: receivedAt, receivedAt });
    }
  }

  private createParticipant(clientId: ClientId): StoredParticipant {
    const existing = this.participants.get(clientId);
    if (existing) return existing;

    const participant: StoredParticipant = {
      clientId,
      lastSequence: 0,
      samples: new CursorSampleBuffer(),
    };
    this.participants.set(clientId, participant);
    return participant;
  }

  private addReaction(reaction: Reaction) {
    this.reactions = [...this.reactions.slice(-(MAX_REACTIONS - 1)), reaction];
    this.notify();
  }

  private notify() {
    for (const listener of this.listeners) listener();
  }
}
