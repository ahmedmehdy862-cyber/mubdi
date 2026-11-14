import { describe, it, expect } from 'vitest';
import { PLATFORM_PRESETS, getPreset } from '../packages/schemas/src/platform';

describe('platform presets', () => {
  it('has 13 presets', () => {
    expect(PLATFORM_PRESETS.length).toBe(13);
  });
  it('instagram post 4:5 dimensions', () => {
    const p = getPreset('ig_post_4x5')!;
    expect(p.width).toBe(1080);
    expect(p.height).toBe(1350);
  });
  it('story safe zones', () => {
    const p = getPreset('ig_story')!;
    expect(p.safeZones.top).toBeGreaterThan(0);
    expect(p.safeZones.bottom).toBeGreaterThan(0);
  });
  it('all presets have positive min font size', () => {
    for (const p of PLATFORM_PRESETS) expect(p.minFontSize).toBeGreaterThan(0);
  });
});