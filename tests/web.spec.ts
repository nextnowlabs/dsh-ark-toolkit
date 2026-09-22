import { existsSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArtifactAccessController } from '../src/artifact-access.ts'
import type { ArkToolkitRuntime, ArkToolkitHealthResult } from '../src/runtime.ts'
import type { RuntimeManagerStatus } from '../src/runtime-manager.ts'
import {
  ArkToolkitWebBackend,
  type WebPluginUpdater,
  type WebRuntimeManager,
} from '../src/web.ts'

const contexts: Context[] = []
const servers: Server[] = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve) => { server.close(() => { resolve() }) })))
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
})

function healthResult(testConnection: boolean): ArkToolkitHealthResult {
  const ok = { status: 'ok' as const, detail: 'fixture ok' }
  return {
    pluginVersion: '0.1.0',
    checks: {
      credential: ok,
      ttsCredential: ok,
      artifactDirectory: ok,
      service: testConnection ? ok : { status: 'not_tested', detail: 'not tested' },
    },
    healthy: true,
    connectionTested: testConnection,
  }
}

/** The runtime face the route reads; configuration is no longer part of it. */
class FakeManager implements WebRuntimeManager {
  readonly healthCalls: Array<{ testConnection: boolean; workspace: string }> = []
  ready = true
  private generation = 1
  readonly runtime = {
    health: async (testConnection: boolean, options: { workspace: string }) => {
      this.healthCalls.push({ testConnection, workspace: options.workspace })
      return healthResult(testConnection)
    },
  } as unknown as ArkToolkitRuntime

  current(): ArkToolkitRuntime { return this.runtime }
  status(): RuntimeManagerStatus {
    return { ready: this.ready, generation: this.generation }
  }
}

class FakeUpdater implements WebPluginUpdater {
  readonly checks = vi.fn(async () => ({
    supported: true,
    profile: 'web',
    dependencySpec: '0.1.0',
    currentVersion: '0.1.0',
    latestVersion: '0.2.0',
    updateAvailable: true,
    checkedAt: '2026-08-16T12:00:00.000Z',
  }))
  readonly installs = vi.fn(async (expectedVersion: string) => ({
    fromVersion: '0.1.0',
    toVersion: expectedVersion,
    profile: 'web',
    restarting: true as const,
    retryAfterMs: 1200,
  }))

  capability() {
    return Promise.resolve({ supported: true, profile: 'web', dependencySpec: '0.1.0' })
  }

  check() {
    return this.checks()
  }

  installAndRestart(expectedVersion: string) {
    return this.installs(expectedVersion)
  }
}

async function setup() {
  const ctx = new Context()
  contexts.push(ctx)
  const manager = new FakeManager()
  const artifacts = new ArtifactAccessController(Buffer.alloc(32, 7))
  const updater = new FakeUpdater()
  const backend = new ArkToolkitWebBackend(ctx, manager, artifacts, updater)
  const server = createServer((req, res) => { void backend.handle(req, res) })
  servers.push(server)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => { resolve() })
  })
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('server did not bind')
  const base = `http://127.0.0.1:${address.port}`
  const post = (body: unknown) => fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify(body),
  })
  return { ctx, manager, updater, base, post }
}

describe('ArkToolkitWebBackend', () => {
  it('reports the serving runtime and the update capability, and nothing about configuration', async () => {
    const { base } = await setup()
    const response = await fetch(base)
    const body = await response.json() as { ok: true; value: Record<string, unknown> }

    expect(response.status).toBe(200)
    expect(body.value).toMatchObject({
      schemaVersion: 1,
      runtime: { ready: true, generation: 1 },
      release: { pluginVersion: expect.any(String), update: { supported: true, profile: 'web' } },
      // No webServer service is mounted here, so the signed Artifact route is
      // deliberately reported as absent rather than promised.
      artifactRouteAvailable: false,
    })
    // Configuration and credentials are the Host's own Remote domains; this
    // route must not become a second, weaker path to the same document.
    expect(body.value).not.toHaveProperty('settings')
    expect(body.value).not.toHaveProperty('credential')
    expect(body.value).not.toHaveProperty('writable')
  })

  it('runs no probe on reads and tests the connection only after the explicit action', async () => {
    const { manager, base, post } = await setup()
    await fetch(base)
    expect(manager.healthCalls).toEqual([])

    const local = await post({ action: 'health', testConnection: false })
    expect(local.status).toBe(200)
    const connection = await post({ action: 'health', testConnection: true })
    expect(connection.status).toBe(200)
    expect(manager.healthCalls).toEqual([
      { testConnection: false, workspace: expect.stringMatching(/dsh-ark-toolkit-health-/) },
      { testConnection: true, workspace: expect.stringMatching(/dsh-ark-toolkit-health-/) },
    ])
    // The artifact policy resolves the workspace before staging anything, so a
    // scratch workspace that was never created made the artifact-directory
    // probe fail regardless of the real configuration.
    expect(existsSync(manager.healthCalls[0]?.workspace ?? '')).toBe(true)
  })

  it('refuses a health probe while no runtime generation is available', async () => {
    const { manager, post } = await setup()
    manager.ready = false

    const response = await post({ action: 'health', testConnection: false })
    const body = await response.json() as { ok: false; error: { code: string } }

    expect(response.status).toBe(503)
    expect(body.error.code).toBe('health-failed')
    expect(manager.healthCalls).toEqual([])
  })

  it('checks and applies a confirmed plugin update through explicit same-origin actions', async () => {
    const { updater, post } = await setup()
    const checked = await post({ action: 'check-update' })
    expect(checked.status).toBe(200)
    await expect(checked.json()).resolves.toMatchObject({
      ok: true,
      value: { latestVersion: '0.2.0', updateAvailable: true },
    })

    const applied = await post({ action: 'apply-update', expectedVersion: '0.2.0' })
    expect(applied.status).toBe(200)
    await expect(applied.json()).resolves.toMatchObject({
      ok: true,
      value: { toVersion: '0.2.0', restarting: true },
    })
    expect(updater.checks).toHaveBeenCalledTimes(1)
    expect(updater.installs).toHaveBeenCalledWith('0.2.0')
  })

  it('rejects an update request without a confirmed target version', async () => {
    const { updater, post } = await setup()
    const response = await post({ action: 'apply-update', expectedVersion: '' })
    expect(response.status).toBe(400)
    expect(updater.installs).not.toHaveBeenCalled()
  })

  it('rejects a configuration write: that path belongs to the Remote settings domain', async () => {
    const { post } = await setup()
    const response = await post({ action: 'save', expectedRevision: 0, value: { concurrency: 2 } })
    const body = await response.json() as { ok: false; error: { code: string; message: string } }

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('invalid-request')
    expect(body.error.message).toMatch(/unsupported action/)
  })

  it('rejects cross-site and non-JSON writes before touching the runtime', async () => {
    const { base } = await setup()
    const crossSite = await fetch(base, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.example' }, body: '{}',
    })
    expect(crossSite.status).toBe(403)
    const plain = await fetch(base, {
      method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: base }, body: '{}',
    })
    expect(plain.status).toBe(400)
  })
})
