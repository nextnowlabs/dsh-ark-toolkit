/**
 * Optional Web-profile routes: signed Artifact delivery plus the same-origin
 * endpoint carrying this plugin's *actions* — health checks and plugin updates.
 *
 * Configuration and credentials are deliberately absent. DSH `0.1.7` reads and
 * writes both over its own Remote domains (`ctx.configForms` and
 * `remote.credentials`), which are revision-fenced and redact secrets at the
 * wire boundary; a private route duplicating them would be a second, weaker
 * write path to the same document.
 * @module dsh-ark-toolkit/web
 */

import { mkdir } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
// Type-only imports activate the optional webServer and subprocess Context declarations.
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-subprocess'
import { ArtifactAccessController, ARTIFACT_ROUTE_PREFIX } from './artifact-access.ts'
import type { ArkToolkitHealthResult } from './runtime.ts'
import {
  PluginUpdateError,
  ArkToolkitPluginUpdateService,
  type PluginUpdateCapability,
  type PluginUpdateCheck,
  type PluginUpdateResult,
} from './plugin-update.ts'
import type { ArkToolkitRuntimeManager, RuntimeManagerStatus } from './runtime-manager.ts'
import { PLUGIN_VERSION } from './version.ts'
import { sameOriginPost } from './web-request.ts'

/** Exact route the browser page posts its actions to. */
export const SETTINGS_ROUTE = '/_dsh/ark-toolkit/settings'

/** Public action snapshot; credential values are deliberately impossible here. */
export interface ArkToolkitSettingsSnapshot {
  schemaVersion: 1
  runtime: RuntimeManagerStatus
  release: {
    pluginVersion: string
    update: PluginUpdateCapability
  }
  artifactRouteAvailable: boolean
}

interface HealthRequest {
  action: 'health'
  testConnection: boolean
}

interface CheckUpdateRequest {
  action: 'check-update'
}

interface ApplyUpdateRequest {
  action: 'apply-update'
  expectedVersion: string
}

type SettingsRequest = HealthRequest | CheckUpdateRequest | ApplyUpdateRequest

interface JsonError {
  ok: false
  error: { code: string; message: string }
}

interface JsonSuccess<T> {
  ok: true
  value: T
}

type JsonResponse<T> = JsonSuccess<T> | JsonError

/** Minimal runtime-manager face used by the Web route and its tests. */
export interface WebRuntimeManager {
  readonly ready: boolean
  current(): ReturnType<ArkToolkitRuntimeManager['current']>
  status(): RuntimeManagerStatus
}

/** Minimal self-update face used by the Web route and its tests. */
export interface WebPluginUpdater {
  configureWebServer?(host: string, port: number): void
  capability(): Promise<PluginUpdateCapability>
  check(): Promise<PluginUpdateCheck>
  installAndRestart(expectedVersion: string): Promise<PluginUpdateResult>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function responseJson<T>(res: ServerResponse, status: number, body: JsonResponse<T>): void {
  const bytes = Buffer.from(JSON.stringify(body))
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Length', String(bytes.length))
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
  res.writeHead(status)
  res.end(bytes)
}

function requestError(res: ServerResponse, status: number, code: string, message: string): void {
  responseJson(res, status, { ok: false, error: { code, message } })
}

async function readJson(req: IncomingMessage, maxBytes = 64 * 1024): Promise<unknown> {
  const contentType = req.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase()
  if (contentType !== 'application/json') throw new TypeError('Content-Type must be application/json')
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of req) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += part.length
    if (bytes > maxBytes) throw new RangeError(`request body exceeds ${maxBytes} bytes`)
    chunks.push(part)
  }
  if (chunks.length === 0) throw new TypeError('request body is empty')
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

function parseRequest(value: unknown): SettingsRequest {
  if (!isRecord(value) || typeof value.action !== 'string') throw new TypeError('request action is required')
  if (value.action === 'health') {
    if (typeof value.testConnection !== 'boolean') throw new TypeError('health.testConnection must be boolean')
    return { action: 'health', testConnection: value.testConnection }
  }
  if (value.action === 'check-update') return { action: 'check-update' }
  if (value.action === 'apply-update') {
    if (typeof value.expectedVersion !== 'string' || value.expectedVersion.trim().length === 0) {
      throw new TypeError('apply-update.expectedVersion must be a non-empty string')
    }
    return { action: 'apply-update', expectedVersion: value.expectedVersion.trim() }
  }
  throw new TypeError(`unsupported action: ${value.action}`)
}

function publicMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

/** Same-origin Settings and health handler. */
export class ArkToolkitWebBackend {
  private readonly updater: WebPluginUpdater

  constructor(
    private readonly ctx: Context,
    private readonly manager: WebRuntimeManager,
    private readonly artifacts: ArtifactAccessController,
    updater?: WebPluginUpdater,
  ) {
    this.updater = updater ?? new ArkToolkitPluginUpdateService(ctx, PLUGIN_VERSION, {
      runtimeReady: () => this.manager.status().ready,
    })
  }

  /** Supply the active listener address before the Settings route becomes reachable. */
  configureWebServer(host: string, port: number): void {
    this.updater.configureWebServer?.(host, port)
  }

  /** Build the current runtime/update snapshot without secrets. */
  async snapshot(): Promise<ArkToolkitSettingsSnapshot> {
    const update = await this.updater.capability()
    return {
      schemaVersion: 1,
      runtime: this.manager.status(),
      release: {
        pluginVersion: PLUGIN_VERSION,
        update,
      },
      artifactRouteAvailable: this.artifacts.routeAvailable,
    }
  }

  private async health(request: HealthRequest, req: IncomingMessage): Promise<ArkToolkitHealthResult> {
    if (!this.manager.ready) throw new Error('runtime is not ready; fix Settings and save a valid configuration first')
    const controller = new AbortController()
    const abort = (): void => { controller.abort() }
    req.once('aborted', abort)
    req.socket.once('close', abort)
    try {
      const runtime = this.manager.current()
      // Health only needs a scratch workspace to validate output staging, and
      // the artifact policy resolves the workspace before it stages anything —
      // so the scratch directory has to exist, or the artifact-directory probe
      // reports a failure that says nothing about the workspace in use.
      const workspace = join(tmpdir(), `dsh-ark-toolkit-health-${process.pid}`)
      await mkdir(workspace, { recursive: true })
      return await runtime.health(request.testConnection, {
        signal: controller.signal,
        workspace,
        sessionId: 'ark-toolkit-settings',
      })
    } finally {
      req.off('aborted', abort)
      req.socket.off('close', abort)
    }
  }

  /** Handle the exact Settings route. */
  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method === 'GET') {
      try {
        responseJson(res, 200, { ok: true, value: await this.snapshot() })
      } catch (error) {
        this.ctx.logger.warn('dsh-ark-toolkit action snapshot failed: %s', publicMessage(error))
        requestError(res, 503, 'actions-unavailable', 'Ark Toolkit runtime status is unavailable')
      }
      return
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      requestError(res, 405, 'method-not-allowed', 'Use GET or POST')
      return
    }
    if (!sameOriginPost(req)) {
      requestError(res, 403, 'origin-rejected', 'The request must originate from this DSH Web application')
      return
    }
    let parsed: SettingsRequest
    try {
      parsed = parseRequest(await readJson(req))
    } catch (error) {
      requestError(res, error instanceof RangeError ? 413 : 400, 'invalid-request', publicMessage(error))
      return
    }
    try {
      switch (parsed.action) {
        case 'health':
          responseJson(res, 200, { ok: true, value: await this.health(parsed, req) })
          break
        case 'check-update':
          responseJson(res, 200, { ok: true, value: await this.updater.check() })
          break
        case 'apply-update':
          responseJson(res, 200, { ok: true, value: await this.updater.installAndRestart(parsed.expectedVersion) })
          break
      }
    } catch (error) {
      const updateError = error instanceof PluginUpdateError
      const code = updateError
        ? error.code
        : parsed.action === 'health'
          ? 'health-failed'
          : 'settings-rejected'
      const updateConflict = updateError && ['update-in-progress', 'update-stale', 'update-unavailable', 'already-current'].includes(error.code)
      const updateGateway = updateError && error.code === 'update-check-failed'
      const status = updateConflict
        ? 409
        : parsed.action === 'health'
          ? 503
          : updateGateway
            ? 502
            : updateError
              ? 500
              : 400
      this.ctx.logger.warn('dsh-ark-toolkit Web action=%s failed: %s', parsed.action, publicMessage(error))
      requestError(res, status, code, publicMessage(error))
    }
  }
}

/**
 * Attach optional Web routes whenever a webServer service is present.
 * @param ctx - plugin context owning route effects.
 * @param backend - Settings handler.
 * @param artifacts - signed Artifact handler.
 */
export function installArkToolkitWeb(
  ctx: Context,
  backend: ArkToolkitWebBackend,
  artifacts: ArtifactAccessController,
): void {
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(() => {
      backend.configureWebServer(webCtx.webServer.host, webCtx.webServer.port)
      const detach = artifacts.attachRoute()
      const disposeArtifact = webCtx.webServer.register({
        kind: 'prefix',
        path: ARTIFACT_ROUTE_PREFIX,
        handler: (req, res) => artifacts.handle(req, res),
      })
      const disposeSettings = webCtx.webServer.register({
        kind: 'exact',
        path: SETTINGS_ROUTE,
        handler: (req, res) => backend.handle(req, res),
      })
      return () => {
        disposeSettings()
        disposeArtifact()
        detach()
      }
    }, 'dsh-ark-toolkit: Web routes')
  })
}
