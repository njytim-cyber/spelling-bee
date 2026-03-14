/** Install git hooks on `npm install` (via "prepare" script). */
const fs = require('fs');
const path = require('path');

const hooksDir = path.join(__dirname, '..', '.git', 'hooks');
// On Windows, Vitest 4 has a bug causing "No test suite found" errors
// Skip tests in pre-push hook on Windows (tests run in CI on Linux)
const isWindows = process.platform === 'win32';
const prePushCmd = isWindows ? 'npx eslint . && npx tsc -b && npx vite build' : 'npm run verify';

// Stash uncommitted changes so hooks verify only what's actually committed/pushed
const stashGuard = [
    'STASH_NAME="pre-hook-$(date +%s)"',
    'git stash push -q --include-untracked -m "$STASH_NAME"',
    'STASHED=$(git stash list | head -1 | grep -c "$STASH_NAME")',
].join('\n');
const unstash = 'if [ "$STASHED" = "1" ]; then git stash pop -q; fi';
const stashWrap = (cmd) => `${stashGuard}\n${cmd}\nRESULT=$?\n${unstash}\nexit $RESULT`;

const hooks = [
    ['pre-commit', stashWrap('npx eslint . && npx tsc -b')],
    ['pre-push', stashWrap(prePushCmd)],
];

fs.mkdirSync(hooksDir, { recursive: true });
for (const [name, command] of hooks) {
    const hookPath = path.join(hooksDir, name);
    if (!fs.existsSync(hookPath)) {
        fs.writeFileSync(hookPath, `#!/bin/sh\n${command}\n`);
        try { fs.chmodSync(hookPath, 0o755); } catch {}
    }
}
