import { spawn } from 'node:child_process';
function run(pkg, args) {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['-y', pkg, ...args], {
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
    setTimeout(() => proc.stdin.write(JSON.stringify(list) + '\n'), 3000);
    setTimeout(() => {
      proc.kill();
      resolve({
        pkg,
        outLen: out.length,
        errTail: err.slice(-300),
        tools: (out.match(/"name":"/g) || []).length,
      });
    }, 12000);
    proc.on('exit', (c) => {});
  });
}
(async () => {
  for (const [p, a] of [
    ['imagemagick-mcp', []],
    ['illustrator-mcp-server', []],
  ]) {
    const r = await run(p, a);
    console.log(JSON.stringify(r));
  }
})();
