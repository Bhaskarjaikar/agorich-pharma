// Manual MedusaJS start to see errors
const { spawn } = require('child_process');

console.log('🚀 Starting MedusaJS backend...\n');

const medusaProcess = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

medusaProcess.on('error', (error) => {
  console.error('❌ Failed to start:', error);
});

medusaProcess.on('exit', (code) => {
  console.log(`\n⚠️  Process exited with code ${code}`);
});

// Keep running for 30 seconds to see output
setTimeout(() => {
  console.log('\n⏱️  Stopping after 30 seconds...');
  medusaProcess.kill();
  process.exit(0);
}, 30000);
















