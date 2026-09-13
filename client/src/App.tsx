import { useEffect, useRef, useState } from 'react';

// 1. Data-Driven Config (No more hardcoding)
const PROFILE_DATA = {
  name: "ADITYA SING",
  id: "23U03031",
  location: "BHOPAL, IN",
  status: "Available for Open Source",
  roles: ["Currently at IIIT Bhopal", "CODING CLUB LEAD"]
};

export default function App() {
  const [time, setTime] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // This ref holds the real-time cursor coordinates from the WebSocket.
  // Mutating this DOES NOT cause React to re-render.
  const remoteCursors = useRef(new Map<string, { x: number, y: number, color: string }>());

  // Slow loop: Clock (React State is fine here)
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fast loop: Cursors (Bypasses React entirely)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId: number;

    const renderLoop = () => {
      if (!ctx) return;
      // Clear previous frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw all remote cursors directly to the canvas
      remoteCursors.current.forEach((cursor, id) => {
        // Draw Cursor Pointer
        ctx.fillStyle = cursor.color;
        ctx.beginPath();
        ctx.moveTo(cursor.x, cursor.y);
        ctx.lineTo(cursor.x + 12, cursor.y + 16);
        ctx.lineTo(cursor.x + 4, cursor.y + 16);
        ctx.lineTo(cursor.x, cursor.y + 24);
        ctx.fill();
        
        // Draw Name Tag
        ctx.font = "10px monospace";
        ctx.fillText(id.substring(0, 4), cursor.x + 16, cursor.y + 16);
      });

      animationId = requestAnimationFrame(renderLoop);
    };
    
    renderLoop();
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Capture local mouse movements to send to WebSocket
  const handleMouseMove = (_event: React.MouseEvent) => {
    void _event;
    // In the next step, this is where we throttle and send to WebSocket:
    // ws.send(JSON.stringify({ type: 'cursor', x: e.clientX, y: e.clientY }))
  };

  return (
    <div 
      className="relative min-h-screen w-full bg-white text-black overflow-hidden font-sans flex items-center justify-center"
      onMouseMove={handleMouseMove}
    >
      {/* LAYER 1: Static Background */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none"
           style={{
             backgroundImage: `linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)`,
             backgroundSize: '40px 40px'
           }}
      />

      <div className="absolute top-4 font-mono text-xs text-gray-400 z-10">{time}</div>

      {/* LAYER 2: Data-Driven UI Components */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="absolute -top-12 -left-28 bg-[#a8e6cf] px-4 py-2 -rotate-6 text-sm shadow-sm z-30">
          {PROFILE_DATA.roles[0]}
        </div>
        
        <div className="border-2 border-cyan-400 bg-white/50 px-6 py-2 z-20">
          <h1 className="text-7xl md:text-9xl font-black uppercase tabular-nums">
            {PROFILE_DATA.name}
          </h1>
        </div>

        <div className="mt-6 flex items-center gap-2 font-mono text-xs font-bold uppercase z-20">
          <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></span>
          {PROFILE_DATA.status}
        </div>
      </div>

      {/* LAYER 3: The High-Performance Real-Time Canvas Overlay */}
      {/* This sits on top of everything and handles the 60fps WebSocket data rendering */}
      <canvas 
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="absolute inset-0 z-50 pointer-events-none"
      />
    </div>
  );
}
