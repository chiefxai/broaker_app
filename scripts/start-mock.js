const { spawn } = require('node:child_process');
const path = require('node:path');

const expoCli = require.resolve('expo/bin/cli', { paths: [process.cwd()] });
const child = spawn(process.execPath, [expoCli, 'start', ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: { ...process.env, EXPO_PUBLIC_APP_MODE: 'mock' },
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error('Could not start Expo in mock mode:', error);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
