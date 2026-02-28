/** Install git hooks on `npm install` (via "prepare" script). */
const fs = require('fs');
const path = require('path');

const hooksDir = path.join(__dirname, '..', '.git', 'hooks');
const hooks = [
    ['pre-commit', 'npx eslint . && npx tsc -b'],
    ['pre-push', 'npm run verify'],
];

fs.mkdirSync(hooksDir, { recursive: true });
for (const [name, command] of hooks) {
    const hookPath = path.join(hooksDir, name);
    if (!fs.existsSync(hookPath)) {
        fs.writeFileSync(hookPath, `#!/bin/sh\n${command}\n`);
        try { fs.chmodSync(hookPath, 0o755); } catch {}
    }
}
