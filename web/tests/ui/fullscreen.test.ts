import { describe, expect, it, vi } from 'vitest';
import { canFullscreen, toggleFullscreen, type FullscreenDocument } from '../../src/ui/fullscreen';

function fake(over: Partial<FullscreenDocument> = {}) {
  const request = vi.fn(() => Promise.resolve());
  const exit = vi.fn(() => Promise.resolve());
  const doc: FullscreenDocument = {
    fullscreenEnabled: true,
    fullscreenElement: null,
    exitFullscreen: exit,
    documentElement: { requestFullscreen: request },
    ...over,
  };
  return { doc, request, exit };
}

describe('fullscreen', () => {
  it('is available only when the browser allows it (iPhone Safari does not)', () => {
    expect(canFullscreen(fake().doc)).toBe(true);
    expect(canFullscreen(fake({ fullscreenEnabled: false }).doc)).toBe(false);
    expect(canFullscreen(fake({ fullscreenEnabled: undefined }).doc)).toBe(false);
  });

  it('enters fullscreen when the page is not in it', async () => {
    const { doc, request } = fake();

    await expect(toggleFullscreen(doc)).resolves.toBe(true);
    expect(request).toHaveBeenCalledOnce();
  });

  it('leaves fullscreen when the page is already in it', async () => {
    const { doc, exit } = fake({ fullscreenElement: {} });

    await expect(toggleFullscreen(doc)).resolves.toBe(false);
    expect(exit).toHaveBeenCalledOnce();
  });

  it('keeps the state when the browser refuses (never throws into the game)', async () => {
    const { doc } = fake({
      documentElement: { requestFullscreen: () => Promise.reject(new Error('denied')) },
    });

    await expect(toggleFullscreen(doc)).resolves.toBe(false);
  });
});
