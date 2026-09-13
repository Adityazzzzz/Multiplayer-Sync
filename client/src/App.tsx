import { useEffect, useMemo, useRef, useState } from 'react';
import { CanvasCursor } from './components/CanvasCursor';
import { CanvasObjects } from './components/CanvasObjects';
import { CanvasToolbar } from './components/CanvasToolbar';
import { PresencePanel } from './components/PresencePanel';
import { ReactionBurst } from './components/ReactionBurst';
import { RoomConnection } from './connection';
import type { ConnectionStatus, Reaction, RemoteParticipant } from './participantStore';

const query = new URLSearchParams(window.location.search);
const ROOM_ID = query.get('room')?.trim() || 'design-jam';
const CLIENT_ID_OVERRIDE = query.get('client')?.trim();
const REACTION_EMOJI = '✦';
const SPARK_EMOJI = '✨'; // Used for the custom spark tool
const REACTION_LIFETIME_MS = 1_600;

type ToolMode = 'pointer' | 'text' | 'spark' | 'draw';

interface Point {
  x: number;
  y: number;
}

export default function App() {
  const connectionRef = useRef<RoomConnection | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [presence, setPresence] = useState<RemoteParticipant[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<RemoteParticipant[]>([]);
  const [reactions, setReactions] = useState<readonly Reaction[]>([]);
  const [localCursor, setLocalCursor] = useState<Point | null>(null);
  const [activeTool, setActiveTool] = useState<ToolMode>('pointer');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const connection = new RoomConnection(
      CLIENT_ID_OVERRIDE ? { roomId: ROOM_ID, clientId: CLIENT_ID_OVERRIDE } : { roomId: ROOM_ID },
    );
    connectionRef.current = connection;

    const unsubscribe = connection.store.subscribe(() => {
      setStatus(connection.store.connectionStatus);
      setPresence(connection.store.getParticipants());
    });

    connection.connect();
    return () => {
      unsubscribe();
      connection.disconnect();
      connectionRef.current = null;
    };
  }, []);

  useEffect(() => {
    let frameId = 0;

    const renderFrame = (now: number) => {
      const connection = connectionRef.current;
      if (connection) {
        setRemoteCursors(connection.store.getParticipants(now));
        setReactions(connection.store.getReactions().filter((reaction) => now - reaction.receivedAt < REACTION_LIFETIME_MS));
      }
      frameId = requestAnimationFrame(renderFrame);
    };

    frameId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const activeRemoteCursors = useMemo(
    () => remoteCursors.filter((participant) => participant.cursor !== null),
    [remoteCursors],
  );

  const updateLocalCursor = (event: React.PointerEvent<HTMLDivElement>) => {
    const position = { x: event.clientX, y: event.clientY };
    setLocalCursor(position);
    connectionRef.current?.sendCursor(position);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const position = { x: event.clientX, y: event.clientY };
    setLocalCursor(position);

    if (activeTool === 'spark') {
      connectionRef.current?.sendReaction(SPARK_EMOJI, position);
    } 
    else if (activeTool === 'text') {
      console.log('Drop sticky note at:', position);
    } 
    else {
      connectionRef.current?.sendReaction(REACTION_EMOJI, position);
    }
  };

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', ROOM_ID);
    navigator.clipboard.writeText(url.toString());
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main
      // Dynamically hide the default cursor only when a custom tool is active
      className={`relative h-dvh w-screen font-sans cursor-none overflow-hidden bg-[#f8f7f4] text-stone-900`}
      onPointerMove={updateLocalCursor}
      onPointerDown={handlePointerDown}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(56,51,43,0.14)_1px,transparent_0)] bg-[size:30px_30px]" />
      <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(214,205,255,0.54),transparent_68%)]" />

      <header className="absolute left-5 top-5 z-20 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#252525] text-lg font-black text-white shadow-[0_7px_16px_rgba(28,25,23,0.18)]">A</div>
        <div className="flex items-center gap-3 rounded-xl border border-black/[0.07] bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">Live canvas</p>
            <h1 className="text-sm font-bold tracking-tight">{ROOM_ID}</h1>
          </div>
          
          {/* Copy Link Button */}
          <button 
            onClick={handleCopyLink}
            className="grid h-7 w-7 place-items-center rounded-lg border border-stone-200 bg-stone-50 text-stone-600 transition-colors hover:bg-stone-100 active:bg-stone-200"
            title="Copy invite link"
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            )}
          </button>
        </div>
      </header>

      <PresencePanel status={status} participants={presence} />
      <CanvasToolbar activeTool={activeTool} setActiveTool={setActiveTool} />
      <CanvasObjects />

      <section className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-8 text-center lg:hidden">
        <div className="max-w-xl rounded-[2rem] border border-white/70 bg-white/55 px-8 py-7 shadow-[0_20px_70px_rgba(53,45,33,0.08)] backdrop-blur-[2px]">
          <span className="mb-3 inline-flex rounded-full bg-[#eeeaff] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6655d7]">Multiplayer space</span>
          <h2 className="text-3xl font-black tracking-[-0.045em] text-stone-800 sm:text-5xl">Make your mark.</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-stone-500">Move to share your cursor. Click anywhere to send a little spark to everyone in this room.</p>
        </div>
      </section>

      <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-xl border border-black/[0.07] bg-white/90 px-4 py-2 shadow-sm backdrop-blur">
        <p className="whitespace-nowrap text-[11px] font-semibold text-stone-500"><span className="mr-2 text-stone-900">{presence.length + 1} {presence.length === 0 ? 'person' : 'people'} in room</span>· Move to collaborate · Click to react</p>
      </div>

      {activeRemoteCursors.map((participant) => (
        <CanvasCursor
          key={participant.clientId}
          clientId={participant.clientId}
          x={participant.cursor!.x}
          y={participant.cursor!.y}
          motion={participant.cursor!.mode}
        />
      ))}
      {localCursor && <CanvasCursor clientId="local" x={localCursor.x} y={localCursor.y} isLocal />}
      {reactions.map((reaction, index) => <ReactionBurst key={`${reaction.clientId}-${reaction.receivedAt}-${index}`} reaction={reaction} />)}
    </main>
  );
}