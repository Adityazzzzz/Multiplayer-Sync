import type { ConnectionStatus, RemoteParticipant } from '../participantStore';
import { colorForClient } from './cursorColor';

interface PresencePanelProps {
  status: ConnectionStatus;
  participants: readonly RemoteParticipant[];
}

const statusCopy: Record<ConnectionStatus, string> = {
  connected: 'Live',
  connecting: 'Connecting',
  reconnecting: 'Reconnecting',
  disconnected: 'Offline',
};

export function PresencePanel({ status, participants }: PresencePanelProps) {
  const isLive = status === 'connected';

  return (
    <div className="absolute right-5 top-5 z-20 flex items-start gap-3">
      <div className="hidden rounded-xl border border-black/[0.07] bg-white/90 px-3 py-2 shadow-sm backdrop-blur sm:block">
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-700">
          <span className={`h-2 w-2 rounded-full ${isLive ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]' : 'bg-amber-400'}`} />
          {statusCopy[status]}
        </div>
      </div>
      <div className="rounded-xl border border-black/[0.07] bg-white/90 p-2 shadow-sm backdrop-blur">
        <div className="flex -space-x-2">
          <div className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-stone-900 text-[9px] font-bold text-white">YOU</div>
          {participants.slice(0, 3).map((participant) => (
            <div
              key={participant.clientId}
              className="grid h-7 w-7 place-items-center rounded-full border-2 border-white text-[9px] font-bold text-white"
              style={{ backgroundColor: colorForClient(participant.clientId) }}
              title={`Participant ${participant.clientId}`}
            >
              {participant.clientId.slice(0, 2).toUpperCase()}
            </div>
          ))}
          {participants.length > 3 && (
            <div className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-stone-200 text-[10px] font-bold text-stone-600">
              +{participants.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
