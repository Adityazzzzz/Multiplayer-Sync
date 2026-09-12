export function createThrottledSender(ws: WebSocket, delayMs: number) {
  let lastCall = 0;
  let pendingPosition: CursorPosition | null = null;
  let timeoutId: number | null = null;

  const send = () => {
    if (!pendingPosition || ws.readyState !== WebSocket.OPEN) return;
    
    ws.send(JSON.stringify({
      type: 'cursor',
      position: pendingPosition,
      timestamp: Date.now()
    }));
    
    pendingPosition = null;
    lastCall = Date.now();
  };

  return (position: CursorPosition) => {
    pendingPosition = position;
    const now = Date.now();
    
    if (now - lastCall >= delayMs) {
      if (timeoutId) clearTimeout(timeoutId);
      send();
    } else if (!timeoutId) {
      timeoutId = window.setTimeout(() => {
        send();
        timeoutId = null;
      }, delayMs - (now - lastCall));
    }
  };
}