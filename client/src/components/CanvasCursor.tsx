import type { CursorMotionMode } from '../interpolation';
import { colorForClient } from './cursorColor';

interface CanvasCursorProps {
  clientId: string;
  x: number;
  y: number;
  isLocal?: boolean;
  motion?: CursorMotionMode;
}

export function CanvasCursor({ clientId, x, y, isLocal = false, motion }: CanvasCursorProps) {
  const color = isLocal ? '#171717' : colorForClient(clientId);
  const label = isLocal ? 'You' : clientId.slice(0, 4).toUpperCase();

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-30 will-change-transform"
      style={{ transform: `translate3d(${x}px, ${y}px, 0)` }}
    >
      <svg className="drop-shadow-sm" width="25" height="33" viewBox="0 0 25 33" aria-hidden="true">
        <path d="M3 2.5 21 21H12l-4.5 8.5L3 2.5Z" fill={color} stroke="white" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <div
        className="ml-4 -mt-1 flex w-max items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold tracking-[0.08em] text-white shadow-sm"
        style={{ backgroundColor: color }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
        {label}
        {motion === 'extrapolating' && <span className="text-white/65">·</span>}
      </div>
    </div>
  );
}
