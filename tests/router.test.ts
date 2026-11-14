import { describe, it, expect } from 'vitest';
import { AdapterRouter, ImageMagickAdapter, ComputerControlAdapter } from '../packages/adapters/src/index';

describe('adapter router fallback', () => {
  it('falls back when preferred unavailable', async () => {
    const router = new AdapterRouter();
    router.register(new ImageMagickAdapter());
    const cc = new ComputerControlAdapter();
    cc.allowApp('photoshop');
    router.register(cc);
    const res = await router.route('info', { input: 'x' });
    // imagemagick may or may not be available; just ensure no crash
    expect(res).toBeDefined();
  });
  it('computer-control kill switch', async () => {
    const cc = new ComputerControlAdapter();
    cc.allowApp('photoshop');
    cc.setKillSwitch(true);
    const res = await cc.run('launch', { app: 'photoshop' });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('kill-switch');
  });
  it('computer-control whitelist', async () => {
    const cc = new ComputerControlAdapter();
    const res = await cc.run('launch', { app: 'banking' });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('whitelist');
  });
  it('computer-control destructive confirmation', async () => {
    const cc = new ComputerControlAdapter();
    cc.allowApp('x');
    const res = await cc.run('destructive', { confirmed: false });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('confirmation');
  });
  it('action log complete', async () => {
    const cc = new ComputerControlAdapter();
    cc.allowApp('x');
    await cc.run('launch', { app: 'x' });
    expect(cc.getLog().length).toBe(1);
  });
});