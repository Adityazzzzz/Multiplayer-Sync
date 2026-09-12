export class CursorState {
  currentX = 0;
  currentY = 0;
  targetX = 0;
  targetY = 0;
  
  updateTarget(x: number, y: number) {
    this.targetX = x;
    this.targetY = y;
  }

  interpolate(smoothness: number = 0.3) {
    this.currentX += (this.targetX - this.currentX) * smoothness;
    this.currentY += (this.targetY - this.currentY) * smoothness;
    
    if (Math.abs(this.targetX - this.currentX) < 0.5) this.currentX = this.targetX;
    if (Math.abs(this.targetY - this.currentY) < 0.5) this.currentY = this.targetY;
  }
}