/** Install git hooks on `npm install` (via "prepare" script). */
const fs = require('fs');
const path = require('path');

const hooksDir = path.join(__dirname, '..', '.git', 'hooks');
// On Windows, Vitest 4 has a bug causing "No test suite found" errors
// Skip tests in pre-push hook on Windows (tests run in CI on Linux)
const isWindows = process.platform === 'win32';
const prePushCmd = isWindows ? 'npx eslint . && npx tsc -b && npx vite build' : 'npm run verify';

const hooks = [
    ['pre-commit', 'npx eslint . && npx tsc -b'],
    ['pre-push', prePushCmd],
];

fs.mkdirSync(hooksDir, { recursive: true });
for (const [name, command] of hooks) {
    const hookPath = path.join(hooksDir, name);
    if (!fs.existsSync(hookPath)) {
        fs.writeFileSync(hookPath, `#!/bin/sh\n${command}\n`);
        try { fs.chmodSync(hookPath, 0o755); } catch {}
    }
}
