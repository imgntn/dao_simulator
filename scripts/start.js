const { spawn } = require('child_process');

const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const cmd = [npmBin, ['run', 'start:next']];
const bindHost = process.env.BIND_HOST
  || (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production' ? '0.0.0.0' : undefined);

console.log(`[start] cmd=${cmd[0]} ${cmd[1].join(' ')}`);
const child = spawn(cmd[0], cmd[1], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    ...(bindHost ? { BIND_HOST: bindHost } : {}),
  },
});
child.on('exit', (code) => process.exit(code ?? 0));
