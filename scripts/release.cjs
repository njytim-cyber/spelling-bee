#!/usr/bin/env node
/**
 * Lightweight release script.
 *
 * Usage:
 *   node scripts/release.cjs patch   # 1.1.0 → 1.1.1
 *   node scripts/release.cjs minor   # 1.1.0 → 1.2.0
 *   node scripts/release.cjs major   # 1.1.0 → 2.0.0
 *
 * What it does:
 *   1. Bumps version in package.json (no package-lock — private project)
 *   2. Prepends a changelog entry to CHANGELOG.md from git log since last tag
 *   3. Stages package.json + CHANGELOG.md
 *   4. Commits as "release: vX.Y.Z"
 *   5. Creates annotated git tag vX.Y.Z
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const CHANGELOG_PATH = path.join(ROOT, 'CHANGELOG.md');

// ── Parse args ──────────────────────────────────────────────────────────────

const bump = process.argv[2];
if (!['patch', 'minor', 'major'].includes(bump)) {
  console.error('Usage: node scripts/release.cjs <patch|minor|major>');
  process.exit(1);
}

// ── Ensure clean working tree ───────────────────────────────────────────────

const status = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf-8' }).trim();
if (status) {
  console.error('Working tree is not clean. Commit or stash changes first.\n' + status);
  process.exit(1);
}

// ── Bump version ────────────────────────────────────────────────────────────

const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf-8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);

let newVersion;
if (bump === 'major') newVersion = `${major + 1}.0.0`;
else if (bump === 'minor') newVersion = `${major}.${minor + 1}.0`;
else newVersion = `${major}.${minor}.${patch + 1}`;

pkg.version = newVersion;
fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Bumped ${pkg.name} ${major}.${minor}.${patch} → ${newVersion}`);

// ── Generate changelog entry ────────────────────────────────────────────────

let lastTag = '';
try {
  lastTag = execSync('git describe --tags --abbrev=0', { cwd: ROOT, encoding: 'utf-8' }).trim();
} catch {
  // No previous tags — use all commits
}

const range = lastTag ? `${lastTag}..HEAD` : 'HEAD';
const log = execSync(`git log ${range} --pretty=format:"- %s" --no-merges`, {
  cwd: ROOT,
  encoding: 'utf-8',
}).trim();

const today = new Date().toISOString().slice(0, 10);
const entry = `## ${newVersion} (${today})\n\n${log || '- No changes'}\n`;

let existing = '';
if (fs.existsSync(CHANGELOG_PATH)) {
  existing = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
}

const header = '# Changelog\n\n';
const body = existing.startsWith('# Changelog')
  ? existing.replace(/^# Changelog\n\n/, '')
  : existing;

fs.writeFileSync(CHANGELOG_PATH, header + entry + '\n' + body);
console.log(`Updated CHANGELOG.md`);

// ── Commit + tag ────────────────────────────────────────────────────────────

execSync(`git add package.json CHANGELOG.md`, { cwd: ROOT });
execSync(`git commit -m "release: v${newVersion}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`git tag -a v${newVersion} -m "v${newVersion}"`, { cwd: ROOT });
console.log(`\nTagged v${newVersion}`);
console.log(`Push with: git push origin main --tags`);
