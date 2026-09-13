import type { Dispatch, SetStateAction } from 'react';

type ToolMode = 'pointer' | 'text' | 'spark' | 'draw';

interface CanvasToolbarProps {
  activeTool: ToolMode;
  setActiveTool: Dispatch<SetStateAction<ToolMode>>;
}

export function CanvasToolbar({ activeTool, setActiveTool }: CanvasToolbarProps) {
  return (
    <div 
      className="absolute left-5 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1 rounded-full border border-black/[0.07] bg-white/90 p-1.5 shadow-sm backdrop-blur"
      onPointerDown={(e) => e.stopPropagation()} // Prevents clicks from leaking to the canvas
    >
      <button 
        onClick={() => setActiveTool('pointer')}
        className={`grid h-10 w-10 place-items-center rounded-full transition-colors ${activeTool === 'pointer' ? 'bg-[#252525] text-white' : 'text-stone-500 hover:bg-stone-100'}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>
      </button>

      <button 
        onClick={() => setActiveTool('text')}
        className={`grid h-10 w-10 place-items-center rounded-full font-bold transition-colors ${activeTool === 'text' ? 'bg-[#252525] text-white' : 'text-stone-500 hover:bg-stone-100'}`}
      >
        T
      </button>

      <button 
        onClick={() => setActiveTool('spark')}
        className={`grid h-10 w-10 place-items-center rounded-full transition-colors ${activeTool === 'spark' ? 'bg-[#ff5a5f] text-white' : 'text-stone-500 hover:bg-stone-100'}`}
      >
        {/* The ✦ Spark Icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z"/></svg>
      </button>
    </div>
  );
}