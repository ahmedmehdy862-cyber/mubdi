import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';

let proc: any;
const BASE = 'http://localhost:8799';

beforeAll(async () => {
  proc = spawn('"C:/Users/Power tech/Documents/mubdi/node_modules/.bin/tsx.cmd"', ['apps/api/src/server.ts'], { shell: true,
    cwd: 'C:/Users/Power tech/Documents/mubdi',
    env: { ...process.env, PORT: '8799', JWT_SECRET: 'test-secret' },
    stdio: 'pipe',
  });
  proc.stderr?.on('data', (d: any) => console.error('APIERR', d.toString()));
  proc.stdout?.on('data', (d: any) => console.log('APIOOUT', d.toString()));
  // wait for boot
  for (let i = 0; i < 25; i++) {
    try {
      const r = await fetch(BASE + '/health');
      if (r.ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
}, 30000);

afterAll(() => { proc?.kill(); });

async function register(email: string) {
  const r = await fetch(BASE + '/v1/auth/register', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('register failed: ' + JSON.stringify(j));
  return j;
}

describe('security authz matrix', () => {
  it('cross-tenant project access fails', async () => {
    const ts = Date.now();
    const a = await register(`a${ts}@test.com`);
    const b = await register(`b${ts}@test.com`);
    // A creates project
    const proj = await (await fetch(BASE + `/v1/workspaces/${a.workspace.id}/projects`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${a.accessToken}` },
      body: JSON.stringify({ name: 'A project' }),
    })).json();
    // B tries to read A's project -> 404
    const r = await fetch(BASE + `/v1/projects/${proj.id}`, { headers: { authorization: `Bearer ${b.accessToken}` } });
    expect(r.status).toBe(404);
  });
  it('unauthenticated request fails', async () => {
    const r = await fetch(BASE + '/v1/workspaces/x/projects');
    expect(r.status).toBe(401);
  });
  it('malformed upload rejected (brief validation)', async () => {
    const a = await register(`c${Date.now()}@test.com`);
    const r = await fetch(BASE + '/v1/brief', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${a.accessToken}` },
      body: JSON.stringify({ prompt: '' }),
    });
    expect(r.status).toBe(400);
  });
});