import { spawn } from 'node:child_process';
const proc = spawn('npx', ['-y', '@alisaitteke/photoshop-mcp'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true,
});
let out = '';
let err = '';
proc.stdout.on('data', (d) => {
  out += d.toString();
  process.stdout.write(d);
});
proc.stderr.on('data', (d) => {
  err += d.toString();
  process.stderr.write(d);
});
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
setTimeout(() => {
  proc.stdin.write(JSON.stringify(list) + '\n');
}, 3000);
setTimeout(() => {
  proc.kill();
  console.log('\n---STDERR TAIL---\n' + err.slice(-500));
}, 12000);
proc.on('exit', (code) => console.log('\nEXIT', code));
