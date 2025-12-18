const { spawn } = require('child_process');
const useSocket = process.env.SOCKET_ONLY === 'true';
const port = process.env.PORT || '8003';

const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const cmd = useSocket
  ? [npmBin, ['run', 'server:start', '--', '--port', port]]
  : [npmBin, ['run', 'start:next']];

console.log(
  `[start] mode=${useSocket ? 'socket' : 'next'} cmd=${cmd[0]} ${cmd[1].join(' ')}`
);
const child = spawn(cmd[0], cmd[1], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
child.on('exit', (code) => process.exit(code ?? 0));
