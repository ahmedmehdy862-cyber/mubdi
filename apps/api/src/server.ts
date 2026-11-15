import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import { z } from 'zod';

const app = Fastify({ logger: true });
app.setErrorHandler((err: any, _req, reply) => {
  if (err?.name === 'ZodError') return reply.code(400).send({ code: 'VALIDATION_ERROR', message: err.message });
  reply.code(err?.statusCode || 500).send({ code: 'ERROR', message: err?.message });
});

await app.register(helmet, { contentSecurityPolicy: false });
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
await app.register(cors, { origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true });
await app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret-change-me' });

// In-memory stores (replace with Postgres in production)
const users = new Map<string, { id: string; email: string; passwordHash: string; role: string }>();
const workspaces = new Map<string, { id: string; name: string; ownerId: string; members: { userId: string; role: string }[] }>();
const projects = new Map<string, { id: string; workspaceId: string; name: string; ownerId: string; spec: unknown; versions: unknown[] }>();

// Helpers
function uid() { return crypto.randomUUID(); }
function hash(pw: string) { return 'h:' + pw; }

// Auth routes
app.post('/v1/auth/register', async (req, reply) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(8) }).parse(req.body);
  if ([...users.values()].some((u) => u.email === body.email)) return reply.code(409).send({ code: 'EMAIL_EXISTS' });
  const user = { id: uid(), email: body.email, passwordHash: hash(body.password), role: 'owner' };
  users.set(user.id, user);
  const ws = { id: uid(), name: 'My Workspace', ownerId: user.id, members: [{ userId: user.id, role: 'owner' }] };
  workspaces.set(ws.id, ws);
  const token = app.jwt.sign({ sub: user.id, ws: ws.id, role: 'owner' }, { expiresIn: '15m' });
  return { user: { id: user.id, email: user.email }, workspace: ws, accessToken: token };
});

app.post('/v1/auth/login', async (req, reply) => {
  const body = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
  const user = [...users.values()].find((u) => u.email === body.email);
  if (!user || user.passwordHash !== hash(body.password)) return reply.code(401).send({ code: 'INVALID_CREDENTIALS' });
  const ws = [...workspaces.values()].find((w) => w.ownerId === user.id)!;
  const token = app.jwt.sign({ sub: user.id, ws: ws.id, role: 'owner' }, { expiresIn: '15m' });
  return { accessToken: token };
});

// Auth guard
app.addHook('preHandler', async (req, reply) => {
  if (req.url.startsWith('/v1/auth') || req.url === '/health' || req.url === '/ready') return;
  try { await req.jwtVerify(); } catch { return reply.code(401).send({ code: 'UNAUTHORIZED' }); }
});

// Workspace isolation helper
function assertWorkspaceAccess(req: any, workspaceId: string) {
  if ((req.user as any).ws !== workspaceId) throw new Error('FORBIDDEN');
}

// Projects
app.post('/v1/workspaces/:wsId/projects', async (req, reply) => {
  const params = z.object({ wsId: z.string() }).parse(req.params);
  assertWorkspaceAccess(req, params.wsId);
  const body = z.object({ name: z.string().min(1) }).parse(req.body);
  const p = { id: uid(), workspaceId: params.wsId, name: body.name, ownerId: (req.user as any).sub, spec: null, versions: [] };
  projects.set(p.id, p);
  return p;
});

app.get('/v1/workspaces/:wsId/projects', async (req) => {
  const params = z.object({ wsId: z.string() }).parse(req.params);
  assertWorkspaceAccess(req, params.wsId);
  return [...projects.values()].filter((p) => p.workspaceId === params.wsId);
});

app.get('/v1/projects/:id', async (req, reply) => {
  const params = z.object({ id: z.string() }).parse(req.params);
  const p = projects.get(params.id);
  if (!p || p.workspaceId !== (req.user as any).ws) return reply.code(404).send({ code: 'NOT_FOUND' });
  return p;
});

app.patch('/v1/projects/:id', async (req, reply) => {
  const params = z.object({ id: z.string() }).parse(req.params);
  const p = projects.get(params.id);
  if (!p || p.workspaceId !== (req.user as any).ws) return reply.code(404).send({ code: 'NOT_FOUND' });
  const body = z.object({ spec: z.unknown().optional(), name: z.string().optional() }).parse(req.body);
  if (body.name) p.name = body.name;
  if (body.spec) { p.versions.push(p.spec); p.spec = body.spec; }
  return p;
});

// Brief endpoint
app.post('/v1/brief', async (req) => {
  const body = z.object({ prompt: z.string().min(1).max(5000) }).parse(req.body);
  // In production: call LLM gateway; here return echo for skeleton
  return { ok: true, prompt: body.prompt, note: 'LLM gateway not wired in skeleton' };
});

app.get('/health', async () => ({ status: 'ok' }));
app.get('/ready', async () => ({ status: 'ready' }));

const port = Number(process.env.PORT || 8787);
await app.listen({ port, host: '0.0.0.0' });
console.log('API listening on', port);
