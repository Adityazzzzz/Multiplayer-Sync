const CURSOR_COLORS = ['#6d5dfc', '#e85d75', '#169f85', '#ed8d31', '#2879f0', '#bc54d3'];

export function colorForClient(clientId: string) {
  let hash = 0;
  for (let index = 0; index < clientId.length; index += 1) {
    hash = (hash * 31 + clientId.charCodeAt(index)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length] ?? CURSOR_COLORS[0]!;
}
