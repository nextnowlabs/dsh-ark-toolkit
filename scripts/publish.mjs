#!/usr/bin/env node
/**
 * Publish @nextnowlabs/dsh-ark-toolkit to the npmjs registry.
 *
 * Why this script exists:
 * - The local npm registry may be a mirror (e.g. npmmirror.com), so every
 *   registry-touching command pins `--registry=https://registry.npmjs.org`.
 * - The package is scoped (@nextnowlabs/...), so publishing requires
 *   `--access public`.
 * - `prepack` already runs `npm run build`; this script additionally gates the
 *   release on tests and the portable-surface verification before bumping.
 * - CI verifies that `lib/` is committed and byte-identical to `npm run build`;
 *   this script refuses to publish from a dirty working tree unless told to.
 *
 * Usage:
 *   node scripts/publish.mjs [--bump <patch|minor|major|1.2.3>] [options]
 *
 * Options:
 *   --bump <patch|minor|major|x.y.z>  Version increment (default: patch).
 *   --dry-run                         Build, verify, and version-bump locally,
 *                                     then print exactly what would be published
 *                                     without touching npm or git.
 *   --no-verify                       Skip build/test/verify:portable gates.
 *   --no-push                         Publish and tag locally, but do not push.
 *   --yes                             Skip the final interactive confirmation.
 *   --access public                   Publish visibility (default: public).
 *
 * Exit codes:
 *   0  published (or dry-run completed)
 *   1  a gate failed or the user aborted
 *   2  usage error
 */

import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const REGISTRY = 'https://registry.npmjs.org'
const PACKAGE_JSON = join(ROOT, 'package.json')

const VERSION_RE = /^\d+\.\d+\.\d+$/
const BUMP_KINDS = new Set(['patch', 'minor', 'major'])

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const flags = {
  bump: 'patch',
  dryRun: false,
  verify: true,
  push: true,
  yes: false,
  access: 'public',
}
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i]
  if (arg === '--dry-run') flags.dryRun = true
  else if (arg === '--no-verify') flags.verify = false
  else if (arg === '--no-push') flags.push = false
  else if (arg === '--yes') flags.yes = true
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

Usage: node scripts/publish.mjs [--bump <patch|minor|major|x.y.z>] [options]

Options:
  --bump <kind|version>  patch (default), minor, major, or an exact "x.y.z".
  --dry-run              Build, verify, and version-bump locally without
                         publishing, tagging, committing, or pushing.
  --no-verify            Skip build / test / verify:portable gates.
  --no-push              Publish and tag locally, but do not push.
  --yes                  Skip the final interactive confirmation.
  --access <scope>       npm publish --access value (default: public).`)
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function run(command, argsList, options = {}) {
  const result = spawnSync(command, argsList, {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...(options.env ?? {}) },
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
// Gates
// ---------------------------------------------------------------------------

const startingVersion = currentVersion()
const nextVersion = bumpVersion(startingVersion, flags.bump)
const tag = `v${nextVersion}`

console.log(`[publish] @nextnowlabs/dsh-ark-toolkit ${startingVersion} -> ${nextVersion}`)
console.log(`[publish] registry: ${REGISTRY}   access: ${flags.access}   mode: ${flags.dryRun ? 'dry-run' : 'publish'}`)
if (flags.dryRun) console.log('[publish] dry-run: no npm publish, no git commit/tag/push will happen.')

// 0. Never try to republish a version that already exists on the registry.
//    npm refuses to overwrite a published version, so fail early with guidance.
try {
  const published = run('npm', ['view', '@nextnowlabs/dsh-ark-toolkit', 'versions', '--json', '--registry', REGISTRY])
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

// 1. Working tree must be clean (committed lib/ is the released artifact).
const dirty = gitStatus()
if (flags.verify && dirty.length > 0) {
  console.error('[publish] working tree is not clean; commit or stash first:')
  for (const line of dirty) console.error(`  ${line}`)
  console.error('[publish] CI requires committed lib/ artifacts; refusing to publish from a dirty tree.')
  process.exit(1)
}

// 2. Authenticate against the real npmjs registry (mirrors may not share auth).
if (!flags.dryRun) {
  try {
    const whoami = run('npm', ['whoami', '--registry', REGISTRY])
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
  run('npm', ['run', 'build'])
  run('npm', ['test'])
  run('npm', ['run', 'verify:portable'])
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
  const packed = run('npm', ['pack', '--dry-run', '--json'], { errorMessage: 'npm pack dry-run failed' })
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
  console.log(`[publish] [dry-run] would set version ${nextVersion} in package.json and tag ${tag}`)
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
  const ok = await ask(`Publish @nextnowlabs/dsh-ark-toolkit@${nextVersion} to ${REGISTRY}?`)
  if (!ok) {
    console.log('[publish] aborted by user.')
    process.exit(1)
  }
}

// ---------------------------------------------------------------------------
// Publish, then commit + tag + push
// ---------------------------------------------------------------------------

if (flags.dryRun) {
  console.log(`[publish] [dry-run] would run: npm publish --registry=${REGISTRY} --access ${flags.access}`)
  console.log(`[publish] [dry-run] would commit "chore(release): ${tag}" and tag ${tag}`)
  if (flags.push) console.log(`[publish] [dry-run] would push main and tag ${tag}`)
  console.log('[publish] dry-run complete.')
  process.exit(0)
}

// 5. Publish. prepack runs `npm run build`, so the tarball is freshly built.
console.log(`[publish] publishing @nextnowlabs/dsh-ark-toolkit@${nextVersion} ...`)
run('npm', ['publish', '--registry', REGISTRY, '--access', flags.access])

// 6. Commit the version bump and tag it.
console.log(`[publish] committing and tagging ${tag} ...`)
run('git', ['add', 'package.json'])
run('git', ['commit', '-m', `chore(release): ${tag}`])

// Create the tag pointing at the release commit (force-safe: only right after commit).
run('git', ['tag', tag])

// 7. Push unless --no-push.
if (flags.push) {
  const branch = run('git', ['branch', '--show-current']).stdout
  console.log(`[publish] pushing ${branch} and ${tag} ...`)
  run('git', ['push', 'origin', branch])
  run('git', ['push', 'origin', tag])
} else {
  console.log('[publish] --no-push: commit and tag created locally; push manually:')
  console.log(`  git push origin main && git push origin ${tag}`)
}

console.log(`[publish] done: @nextnowlabs/dsh-ark-toolkit@${nextVersion} (${tag})`)
console.log(`[publish] changelog reminder: move "## [Unreleased]" into "## [${nextVersion}] - <date>" in CHANGELOG.md.`)
