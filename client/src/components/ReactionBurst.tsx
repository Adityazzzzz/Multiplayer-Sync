import type { Reaction } from '../participantStore';

interface ReactionBurstProps {
  reaction: Reaction;
}

export function ReactionBurst({ reaction }: ReactionBurstProps) {
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-40"
      style={{ transform: `translate3d(${reaction.position.x - 24}px, ${reaction.position.y - 24}px, 0)` }}
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-white/85 text-2xl shadow-[0_8px_20px_rgba(28,25,23,0.16)] backdrop-blur-sm animate-[reaction-pop_1.6s_ease-out_forwards]">
        {reaction.reactionId}
      </div>
    </div>
  );
}
