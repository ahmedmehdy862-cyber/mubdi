export interface AdapterResult<T = unknown> { ok: boolean; tier: number; data?: T; error?: string; }
export interface Adapter {
  name: string;
  tier: number;
  isAvailable(): Promise<boolean>;
  capabilities(): string[];
  run(action: string, args: Record<string, unknown>): Promise<AdapterResult>;
}

export class ImageMagickAdapter implements Adapter {
  name = 'imagemagick';
  tier = 1;
  async isAvailable() {
    try {
      const { execFileSync } = await import('node:child_process');
      execFileSync('magick', ['--version'], { stdio: 'ignore' });
      return true;
    } catch { return false; }
  }
  capabilities() { return ['resize', 'convert', 'composite', 'text-overlay', 'info']; }
  async run(action: string, args: Record<string, unknown>): Promise<AdapterResult> {
    const { execFileSync } = await import('node:child_process');
    try {
      if (action === 'info') {
        const out = execFileSync('magick', ['identify', '-format', '%w %h %m', String(args.input)], { encoding: 'utf8' });
        return { ok: true, tier: this.tier, data: out.trim() };
      }
      if (action === 'convert') {
        execFileSync('magick', [String(args.input), String(args.output)], { stdio: 'ignore' });
        return { ok: true, tier: this.tier };
      }
      return { ok: false, tier: this.tier, error: 'unknown action' };
    } catch (e: any) {
      return { ok: false, tier: this.tier, error: e.message };
    }
  }
}

export class PhotoshopAdapter implements Adapter {
  name = 'photoshop';
  tier = 2;
  async isAvailable() { return false; } // requires MCP server; wired in Phase 6
  capabilities() { return ['compositing', 'retouch', 'smart-objects', 'verify-psd']; }
  async run() { return { ok: false, tier: this.tier, error: 'not wired' }; }
}

export class IllustratorAdapter implements Adapter {
  name = 'illustrator';
  tier = 2;
  async isAvailable() { return false; }
  capabilities() { return ['vector', 'live-text', 'export-ai']; }
  async run() { return { ok: false, tier: this.tier, error: 'not wired' }; }
}

export class ComputerControlAdapter implements Adapter {
  name = 'computer-control';
  tier = 4;
  private killSwitch = false;
  private whitelist = new Set<string>();
  private log: { action: string; ts: number }[] = [];
  async isAvailable() { return true; }
  capabilities() { return ['screenshot', 'click', 'type', 'kill-switch', 'whitelist']; }
  setKillSwitch(v: boolean) { this.killSwitch = v; }
  isKilled() { return this.killSwitch; }
  allowApp(app: string) { this.whitelist.add(app); }
  isAllowed(app: string) { return this.whitelist.has(app); }
  async run(action: string, args: Record<string, unknown>): Promise<AdapterResult> {
    if (this.killSwitch) return { ok: false, tier: this.tier, error: 'kill-switch engaged' };
    if (action === 'launch' && !this.whitelist.has(String(args.app))) {
      return { ok: false, tier: this.tier, error: 'app not whitelisted' };
    }
    if (action === 'destructive' && !args.confirmed) {
      return { ok: false, tier: this.tier, error: 'confirmation required' };
    }
    this.log.push({ action, ts: Date.now() });
    return { ok: true, tier: this.tier, data: { logged: true } };
  }
  getLog() { return this.log; }
}

export class AdapterRouter {
  private adapters: Adapter[] = [];
  register(a: Adapter) { this.adapters.push(a); this.adapters.sort((x, y) => x.tier - y.tier); }
  async route(action: string, args: Record<string, unknown>, preferredTier?: number): Promise<AdapterResult> {
    const candidates = this.adapters.filter((a) => a.capabilities().includes(action) || true);
    // try preferred tier first if available
    const ordered = preferredTier ? [...candidates].sort((a, b) => (a.tier === preferredTier ? -1 : b.tier === preferredTier ? 1 : a.tier - b.tier)) : candidates;
    for (const a of ordered) {
      if (!(await a.isAvailable())) continue;
      const res = await a.run(action, args);
      if (res.ok) return res;
    }
    return { ok: false, tier: 0, error: 'no adapter available' };
  }
  list() { return this.adapters.map((a) => ({ name: a.name, tier: a.tier, available: false })); }
}