import type { CursorPosition } from '../../shared/protocol';

export const INTERPOLATION_DELAY_MS = 25;
export const MAX_EXTRAPOLATION_MS = 25;
const MAX_SAMPLES = 3;

export interface TimedCursorSample extends CursorPosition {
  /** Sender wall-clock time, retained for diagnostics. */
  sentAt: number;
  /** Local monotonic time when the browser received the sample. */
  receivedAt: number;
}

export type CursorMotionMode = 'interpolating' | 'extrapolating' | 'holding';

export interface InterpolatedCursor extends CursorPosition {
  mode: CursorMotionMode;
}

/**
 * A tiny, bounded jitter buffer. Rendering 100 ms behind locally received samples
 * avoids depending on clocks being synchronized between different browsers.
 */
export class CursorSampleBuffer {
  private readonly samples: TimedCursorSample[] = [];

  push(sample: TimedCursorSample) {
    this.samples.push(sample);
    if (this.samples.length > MAX_SAMPLES) this.samples.shift();
  }

  clear() {
    this.samples.length = 0;
  }

  get size() {
    return this.samples.length;
  }

  getPosition(renderedAt: number): InterpolatedCursor | null {
    const first = this.samples[0];
    const last = this.samples.at(-1);
    if (!first || !last) return null;

    const targetTime = renderedAt - INTERPOLATION_DELAY_MS;
    if (this.samples.length === 1 || targetTime <= first.receivedAt) {
      return { x: first.x, y: first.y, mode: 'holding' };
    }

    for (let index = 1; index < this.samples.length; index += 1) {
      const next = this.samples[index];
      const previous = this.samples[index - 1];
      if (!next || !previous || targetTime > next.receivedAt) continue;

      const duration = next.receivedAt - previous.receivedAt;
      if (duration <= 0) return { x: next.x, y: next.y, mode: 'holding' };

      const progress = (targetTime - previous.receivedAt) / duration;
      return {
        x: previous.x + (next.x - previous.x) * progress,
        y: previous.y + (next.y - previous.y) * progress,
        mode: 'interpolating',
      };
    }

    const previous = this.samples.at(-2);
    if (!previous) return { x: last.x, y: last.y, mode: 'holding' };

    const sampleDuration = last.receivedAt - previous.receivedAt;
    if (sampleDuration <= 0) return { x: last.x, y: last.y, mode: 'holding' };

    // Clamp prediction to a short horizon; after it, the cursor stops instead of drifting.
    const extrapolationMs = Math.min(targetTime - last.receivedAt, MAX_EXTRAPOLATION_MS);
    if (extrapolationMs <= 0) return { x: last.x, y: last.y, mode: 'holding' };

    return {
      x: last.x + ((last.x - previous.x) / sampleDuration) * extrapolationMs,
      y: last.y + ((last.y - previous.y) / sampleDuration) * extrapolationMs,
      mode: 'extrapolating',
    };
  }
}
