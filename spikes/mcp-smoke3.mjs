import { spawn } from 'node:child_process';
const proc = spawn('npx', ['-y', 'illustrator-mcp-server'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true,
});
let out = '';
let err = '';
proc.stdout.on('data', (d) => (out += d.toString()));
proc.stderr.on('data', (d) => (err += d.toString()));
const init = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'spike', version: '0.1' },
  },
};
const list = { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} };
proc.stdin.write(JSON.stringify(init) + '\n');
setTimeout(() => proc.stdin.write(JSON.stringify(list) + '\n'), 8000);
setTimeout(() => {
  proc.kill();
  console.log('OUTLEN', out.length, 'TOOLS', (out.match(/"name":"/g) || []).length);
  console.log('ERRTAIL', err.slice(-400));
}, 30000);
proc.on('exit', (c) => console.log('EXIT', c));
