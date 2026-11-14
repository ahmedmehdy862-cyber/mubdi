import Fastify from 'fastify';
import { z } from 'zod';

const app = Fastify({ logger: false });
const Brief = z.object({ prompt: z.string().min(1).max(2000), platform: z.string().optional() });

app.get('/health', async () => ({ status: 'ok', ts: Date.now() }));
app.get('/ready', async () => ({ status: 'ready' }));
app.post('/v1/brief', async (req, reply) => {
  const parsed = Brief.safeParse(req.body);
  if (!parsed.success)
    return reply
      .code(400)
      .send({ code: 'VALIDATION_ERROR', message: 'invalid brief', hint: 'check prompt' });
  return { ok: true, brief: parsed.data };
});

const port = process.env.PORT || 8787;
await app.listen({ port, host: '0.0.0.0' });
console.log('listening', port);
