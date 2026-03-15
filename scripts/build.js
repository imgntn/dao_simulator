const { spawn } = require('child_process');

const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const cmd = [npmBin, ['run', 'build:next']];

console.log(`[build] cmd=${cmd[0]} ${cmd[1].join(' ')}`);
const child = spawn(cmd[0], cmd[1], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
child.on('exit', (code) => process.exit(code ?? 0));
