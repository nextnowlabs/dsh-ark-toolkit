#!/usr/bin/env node
/**
 * Publish @nextnowlabs/dsh-ark-toolkit to the npmjs registry.
 *
 * Why this script exists (learned from the 0.0.5 publish failure and the
 * dsh-openviking 0.2.3 incident):
 * - `publish` is an npm lifecycle script name: `npm publish` runs the
 *   package.json script named "publish" AGAIN after uploading the tarball.
 *   The 0.0.5 release was uploaded successfully, then the nested copy of this
 *   script failed with "version already exists" and npm publish exited
 *   non-zero without creating the git tag. Publish via `npm run release`,
 *   never a bare `npm publish` (a re-entry guard is kept as a second line of
 *   defense).
 * - The local npm registry may be a mirror (e.g. npmmirror.com), so every
 *   registry-touching command pins `--registry=https://registry.npmjs.org`.
 * - ~/.npm may be read-only (EROFS) in sandbox/CI, so all npm commands use
 *   the repo-local writable cache dir `.npm-cache/` (gitignored).
 * - The package is scoped (@nextnowlabs/...), so publishing requires
 *   `--access public`.
 * - `prepack` already runs `npm run build`; this script additionally gates the
 *   release on tests and the portable-surface verification before bumping.
 * - CI verifies that `lib/` is committed and byte-identical to `npm run build`;
 *   this script refuses to publish from a dirty working tree unless told to.
 *
 * Usage:
 *   npm run release                  # same as node scripts/publish.mjs
 *   node scripts/publish.mjs [--bump <patch|minor|major|1.2.3>] [options]
 *
 * Options:
 *   --bump <patch|minor|major|x.y.z>  Version increment (default: patch).
 *   --dry-run                         Build, verify, and version-bump locally,
 *                                     then print exactly what would be published
 *                                     without touching npm or git.
 *   --no-verify                       Skip build/test/verify:portable gates.
 *   --skip-checks                     Skip branch / dirty-tree checks (CI).
 *   --force                           Allow publishing a version that already
 *                                     exists on the registry.
 *   --tag <name>                      npm dist-tag (default: beta for
 *                                     prerelease versions, latest otherwise).
 *   --otp <code>                      One-time password (two-factor auth);
 *                                     NPM_OTP environment variable also works.
 *   --no-push                         Publish and tag locally, but do not push.
 *   --no-git-tag                      Publish without creating a git tag.
 *   --yes                             Skip the final interactive confirmation.
 *   --access public                   Publish visibility (default: public).
 *
 * Exit codes:
 *   0  published (or dry-run completed)
 *   1  a gate failed or the user aborted
 *   2  usage error
 */

import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const REGISTRY = 'https://registry.npmjs.org'
const PACKAGE_JSON = join(ROOT, 'package.json')
// npm writes the tarball / cache under this directory; use a repo-local
// writable cache (gitignored) so pack/publish work even when ~/.npm is
// read-only (sandbox/CI EROFS).
const CACHE_DIR = process.env.NPM_CONFIG_CACHE ?? join(ROOT, '.npm-cache')

const VERSION_RE = /^\d+\.\d+\.\d+$/
const BUMP_KINDS = new Set(['patch', 'minor', 'major'])

// ---------------------------------------------------------------------------
// Re-entry guard: `publish` is an npm lifecycle script name
// ---------------------------------------------------------------------------
// `npm publish` runs the package.json script named "publish" again after the
// tarball is uploaded. If we are running under that lifecycle event, a nested
// copy of this script has re-entered itself (0.0.5 incident: the package WAS
// uploaded, then the nested script reported "version already exists" and made
// the whole npm publish exit non-zero). Always publish via `npm run release`.
if (process.env.npm_lifecycle_event === 'publish') {
  console.error('[publish] re-entered from the npm "publish" lifecycle hook: npm publish runs the script named "publish" again after uploading.')
  console.error('[publish] the package may already have been uploaded; do not retry blindly.')
  console.error('[publish] use: npm run release')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const flags = {
  bump: 'patch',
  dryRun: false,
  verify: true,
  push: true,
  gitTag: true,
  skipChecks: false,
  force: false,
  yes: false,
  access: 'public',
  tag: '',
  otp: process.env.NPM_OTP ?? '',
}
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i]
  if (arg === '--dry-run') flags.dryRun = true
  else if (arg === '--no-verify') flags.verify = false
  else if (arg === '--no-push') flags.push = false
  else if (arg === '--no-git-tag') flags.gitTag = false
  else if (arg === '--skip-checks') flags.skipChecks = true
  else if (arg === '--force') flags.force = true
  else if (arg === '--yes') flags.yes = true
  else if (arg === '--tag') flags.tag = args[++i]
  else if (arg === '--otp') flags.otp = args[++i]
  else if (arg === '--access') flags.access = args[++i]
  else if (arg === '--bump') flags.bump = args[++i]
  else if (arg === '--help' || arg === '-h') { printHelp(); process.exit(0) }
  else {
    console.error(`[publish] unknown argument: ${arg}`)
    printHelp()
    process.exit(2)
  }
}

if (!BUMP_KINDS.has(flags.bump) && !VERSION_RE.test(flags.bump)) {
  console.error(`[publish] --bump must be patch|minor|major or an exact "x.y.z" version, got: ${flags.bump}`)
  process.exit(2)
}

function printHelp() {
  console.log(`Publish @nextnowlabs/dsh-ark-toolkit to npmjs.

Usage: npm run release [-- <options>]   (or: node scripts/publish.mjs [options])

Options:
  --bump <kind|version>  patch (default), minor, major, or an exact "x.y.z".
  --dry-run              Build, verify, and version-bump locally without
                         publishing, tagging, committing, or pushing.
  --no-verify            Skip build / test / verify:portable gates.
  --skip-checks          Skip branch / dirty-tree checks (for CI).
  --force                Allow publishing a version already on the registry.
  --tag <name>           npm dist-tag (default: beta for prerelease, latest).
  --otp <code>           One-time password; NPM_OTP env var also works.
  --no-push              Publish and tag locally, but do not push.
  --no-git-tag           Publish without creating a git tag.
  --yes                  Skip the final interactive confirmation.
  --access <scope>       npm publish --access value (default: public).`)
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

// Every child process inherits the local npm cache dir so nested npm
// invocations (e.g. the prepack hook's `npm pack`) never touch ~/.npm.
function run(command, argsList, options = {}) {
  const result = spawnSync(command, argsList, {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, npm_config_cache: CACHE_DIR, ...(options.env ?? {}) },
    stdio: ['inherit', 'pipe', 'pipe'],
  })
  const stdout = String(result.stdout ?? '').trim()
  const stderr = String(result.stderr ?? '').trim()
  if (result.status !== 0) {
    const message = options.errorMessage ?? `command failed: ${command} ${argsList.join(' ')}`
    throw new Error(`${message}${stderr ? `\n${stderr}` : ''}`)
  }
  return { status: result.status, stdout, stderr }
}

// npm helper: registry-touching commands pin the official registry and use
// the repo-local cache dir (pass registry: false for purely local commands).
function npm(argsList, options = {}) {
  const fullArgs = options.registry === false
    ? [...argsList, '--cache', CACHE_DIR]
    : [...argsList, '--registry', REGISTRY, '--cache', CACHE_DIR]
  return run('npm', fullArgs, options)
}

function currentVersion() {
  return JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')).version
}

function bumpVersion(current, bump) {
  if (VERSION_RE.test(bump)) return bump
  const [major, minor, patch] = current.split('.').map(Number)
  if (bump === 'major') return `${major + 1}.0.0`
  if (bump === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

function ask(question) {
  process.stdout.write(`${question} [y/N] `)
  return new Promise((resolve) => {
    process.stdin.once('data', (chunk) => {
      const answer = String(chunk).trim().toLowerCase()
      resolve(answer === 'y' || answer === 'yes')
    })
  })
}

function gitStatus() {
  const result = spawnSync('git', ['status', '--porcelain'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
  })
  return String(result.stdout ?? '').split('\n').filter(Boolean)
}

// ---------------------------------------------------------------------------
// Setup and plan
// ---------------------------------------------------------------------------

mkdirSync(CACHE_DIR, { recursive: true })

const startingVersion = currentVersion()
const nextVersion = bumpVersion(startingVersion, flags.bump)
const tag = flags.tag || (nextVersion.includes('-') ? 'beta' : 'latest')

console.log(`[publish] @nextnowlabs/dsh-ark-toolkit ${startingVersion} -> ${nextVersion}`)
console.log(`[publish] registry: ${REGISTRY}   access: ${flags.access}   dist-tag: ${tag}   mode: ${flags.dryRun ? 'dry-run' : 'publish'}`)
console.log(`[publish] npm cache: ${CACHE_DIR}`)
if (flags.dryRun) console.log('[publish] dry-run: no npm publish, no git commit/tag/push will happen.')

// 0. Never try to republish a version that already exists on the registry.
//    npm refuses to overwrite a published version, so fail early with guidance
//    (unless --force).
if (!flags.force) {
  try {
    const published = npm(['view', '@nextnowlabs/dsh-ark-toolkit', 'versions', '--json'])
    const existing = new Set(JSON.parse(published.stdout))
    if (existing.has(nextVersion)) {
      console.error(`[publish] version ${nextVersion} is already published on ${REGISTRY}.`)
      console.error('[publish] choose a higher --bump, or unpublish the broken version first.')
      process.exit(1)
    }
    const latest = [...existing].sort().at(-1)
    if (latest !== undefined && latest !== startingVersion) {
      console.log(`[publish] note: latest published version is ${latest}; local package.json is ${startingVersion}.`)
    }
  } catch (error) {
    // The registry may be unreachable; do not hard-fail the local dry-run for
    // that alone, but surface the problem so a real publish can be re-checked.
    console.warn(`[publish] warning: could not check published versions: ${error.message}`)
  }
}

// 1. Branch + clean working tree (committed lib/ is the released artifact).
if (!flags.skipChecks) {
  const branch = run('git', ['branch', '--show-current']).stdout
  if (branch !== 'main') {
    console.error(`[publish] current branch is '${branch}'; release from main (or use --skip-checks).`)
    process.exit(1)
  }
  const dirty = gitStatus()
  if (flags.verify && dirty.length > 0) {
    console.error('[publish] working tree is not clean; commit or stash first:')
    for (const line of dirty) console.error(`  ${line}`)
    console.error('[publish] CI requires committed lib/ artifacts; refusing to publish from a dirty tree.')
    process.exit(1)
  }
}

// 2. Authenticate against the real npmjs registry (mirrors may not share auth).
if (!flags.dryRun) {
  try {
    const whoami = npm(['whoami'])
    console.log(`[publish] authenticated to ${REGISTRY} as ${whoami.stdout}`)
  } catch {
    console.error('[publish] not authenticated to the npmjs registry.')
    console.error('[publish] run: npm login --registry=https://registry.npmjs.org')
    process.exit(1)
  }
}

// 3. Verify build + tests + portable surface.
if (flags.verify) {
  console.log('[publish] running build / test / verify:portable ...')
  npm(['run', 'build'])
  npm(['run', 'test'])
  npm(['run', 'verify:portable'])
  // Re-check the tree: the build must not modify committed artifacts.
  const afterBuild = gitStatus()
  if (afterBuild.length > 0) {
    console.error('[publish] build modified the working tree; commit the generated lib/ first:')
    for (const line of afterBuild) console.error(`  ${line}`)
    process.exit(1)
  }
}

// 4. Show exactly what the tarball will contain (dry-run pack).
console.log('[publish] package contents (npm pack --dry-run):')
try {
  const packed = npm(['pack', '--dry-run', '--json'], { registry: false, errorMessage: 'npm pack dry-run failed' })
  try {
    const details = JSON.parse(packed.stdout)
    for (const entry of details) {
      const packedMiB = ((entry.size ?? 0) / 1024 / 1024).toFixed(1)
      console.log(`  ${entry.filename}  (${entry.entryCount ?? '?'} files, ${packedMiB} MiB packed)`)
    }
  } catch {
    // The JSON parse failed but the pack succeeded; nothing to show.
  }
} catch {
  // A failing pack (e.g. an unbuildable tarball) must block the release: the
  // publish would run the same prepack + pack path and fail identically.
  console.error('[publish] npm pack --dry-run failed; the package cannot be packed, so it cannot be published.')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Apply the version bump
// ---------------------------------------------------------------------------

if (flags.dryRun) {
  console.log(`[publish] [dry-run] would set version ${nextVersion} in package.json and tag v${nextVersion}`)
} else {
  // Bump in package.json only; the git commit/tag are managed below.
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'))
  pkg.version = nextVersion
  writeFileSync(PACKAGE_JSON, `${JSON.stringify(pkg, null, 2)}\n`)
  console.log(`[publish] bumped package.json to ${nextVersion}`)
}

// ---------------------------------------------------------------------------
// Final confirmation
// ---------------------------------------------------------------------------

if (!flags.dryRun && !flags.yes) {
  const ok = await ask(`Publish @nextnowlabs/dsh-ark-toolkit@${nextVersion} (dist-tag ${tag}) to ${REGISTRY}?`)
  if (!ok) {
    console.log('[publish] aborted by user.')
    process.exit(1)
  }
}

// ---------------------------------------------------------------------------
// Publish, then commit + tag + push
// ---------------------------------------------------------------------------

if (flags.dryRun) {
  const otpNote = flags.otp ? ' --otp <code>' : ''
  console.log(`[publish] [dry-run] would run: npm publish --registry=${REGISTRY} --access ${flags.access} --tag ${tag}${otpNote}`)
  console.log(`[publish] [dry-run] would commit "chore(release): v${nextVersion}" and tag v${nextVersion}`)
  if (flags.push) console.log(`[publish] [dry-run] would push main and tag v${nextVersion}`)
  console.log('[publish] dry-run complete.')
  process.exit(0)
}

// 5. Publish. prepack runs `npm run build`, so the tarball is freshly built.
const publishArgs = ['publish', '--access', flags.access, '--tag', tag]
if (flags.otp) publishArgs.push('--otp', flags.otp)
console.log(`[publish] publishing @nextnowlabs/dsh-ark-toolkit@${nextVersion} (dist-tag ${tag}) ...`)
npm(publishArgs)

// 6. Commit the version bump and tag it.
console.log(`[publish] committing and tagging v${nextVersion} ...`)
run('git', ['add', 'package.json'])
run('git', ['commit', '-m', `chore(release): v${nextVersion}`])

if (flags.gitTag) {
  // Create the tag pointing at the release commit (force-safe: only right after commit).
  run('git', ['tag', `v${nextVersion}`])
} else {
  console.log('[publish] --no-git-tag: skipping git tag creation.')
}

// 7. Push unless --no-push.
if (flags.push) {
  const branch = run('git', ['branch', '--show-current']).stdout
  console.log(`[publish] pushing ${branch} and v${nextVersion} ...`)
  run('git', ['push', 'origin', branch])
  if (flags.gitTag) run('git', ['push', 'origin', `v${nextVersion}`])
} else {
  console.log('[publish] --no-push: commit and tag created locally; push manually:')
  console.log(`  git push origin main && git push origin v${nextVersion}`)
}

console.log(`[publish] done: @nextnowlabs/dsh-ark-toolkit@${nextVersion} (v${nextVersion})`)
console.log('[publish] changelog reminder: move "## [Unreleased]" into "## [<version>] - <date>" in CHANGELOG.md.')
