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
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ARTIFACT_ROUTE_PREFIX } from "./artifact-access.js";
import { PluginUpdateError, ArkToolkitPluginUpdateService, } from "./plugin-update.js";
import { PLUGIN_VERSION } from "./version.js";
import { sameOriginPost } from "./web-request.js";
/** Exact route the browser page posts its actions to. */
export const SETTINGS_ROUTE = '/_dsh/ark-toolkit/settings';
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function responseJson(res, status, body) {
    const bytes = Buffer.from(JSON.stringify(body));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Length', String(bytes.length));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    res.writeHead(status);
    res.end(bytes);
}
function requestError(res, status, code, message) {
    responseJson(res, status, { ok: false, error: { code, message } });
}
async function readJson(req, maxBytes = 64 * 1024) {
    const contentType = req.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase();
    if (contentType !== 'application/json')
        throw new TypeError('Content-Type must be application/json');
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
        const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += part.length;
        if (bytes > maxBytes)
            throw new RangeError(`request body exceeds ${maxBytes} bytes`);
        chunks.push(part);
    }
    if (chunks.length === 0)
        throw new TypeError('request body is empty');
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function parseRequest(value) {
    if (!isRecord(value) || typeof value.action !== 'string')
        throw new TypeError('request action is required');
    if (value.action === 'health') {
        if (typeof value.testConnection !== 'boolean')
            throw new TypeError('health.testConnection must be boolean');
        return { action: 'health', testConnection: value.testConnection };
    }
    if (value.action === 'check-update')
        return { action: 'check-update' };
    if (value.action === 'apply-update') {
        if (typeof value.expectedVersion !== 'string' || value.expectedVersion.trim().length === 0) {
            throw new TypeError('apply-update.expectedVersion must be a non-empty string');
        }
        return { action: 'apply-update', expectedVersion: value.expectedVersion.trim() };
    }
    throw new TypeError(`unsupported action: ${value.action}`);
}
function publicMessage(error) {
    if (error instanceof Error)
        return error.message;
    return String(error);
}
/** Same-origin Settings and health handler. */
export class ArkToolkitWebBackend {
    ctx;
    manager;
    artifacts;
    updater;
    constructor(ctx, manager, artifacts, updater) {
        this.ctx = ctx;
        this.manager = manager;
        this.artifacts = artifacts;
        this.updater = updater ?? new ArkToolkitPluginUpdateService(ctx, PLUGIN_VERSION, {
            runtimeReady: () => this.manager.status().ready,
        });
    }
    /** Supply the active listener address before the Settings route becomes reachable. */
    configureWebServer(host, port) {
        this.updater.configureWebServer?.(host, port);
    }
    /** Build the current runtime/update snapshot without secrets. */
    async snapshot() {
        const update = await this.updater.capability();
        return {
            schemaVersion: 1,
            runtime: this.manager.status(),
            release: {
                pluginVersion: PLUGIN_VERSION,
                update,
            },
            artifactRouteAvailable: this.artifacts.routeAvailable,
        };
    }
    async health(request, req) {
        if (!this.manager.ready)
            throw new Error('runtime is not ready; fix Settings and save a valid configuration first');
        const controller = new AbortController();
        const abort = () => { controller.abort(); };
        req.once('aborted', abort);
        req.socket.once('close', abort);
        try {
            const runtime = this.manager.current();
            // Health only needs a scratch workspace to validate output staging, and
            // the artifact policy resolves the workspace before it stages anything —
            // so the scratch directory has to exist, or the artifact-directory probe
            // reports a failure that says nothing about the workspace in use.
            const workspace = join(tmpdir(), `dsh-ark-toolkit-health-${process.pid}`);
            await mkdir(workspace, { recursive: true });
            return await runtime.health(request.testConnection, {
                signal: controller.signal,
                workspace,
                sessionId: 'ark-toolkit-settings',
            });
        }
        finally {
            req.off('aborted', abort);
            req.socket.off('close', abort);
        }
    }
    /** Handle the exact Settings route. */
    async handle(req, res) {
        if (req.method === 'GET') {
            try {
                responseJson(res, 200, { ok: true, value: await this.snapshot() });
            }
            catch (error) {
                this.ctx.logger.warn('dsh-ark-toolkit action snapshot failed: %s', publicMessage(error));
                requestError(res, 503, 'actions-unavailable', 'Ark Toolkit runtime status is unavailable');
            }
            return;
        }
        if (req.method !== 'POST') {
            res.setHeader('Allow', 'GET, POST');
            requestError(res, 405, 'method-not-allowed', 'Use GET or POST');
            return;
        }
        if (!sameOriginPost(req)) {
            requestError(res, 403, 'origin-rejected', 'The request must originate from this DSH Web application');
            return;
        }
        let parsed;
        try {
            parsed = parseRequest(await readJson(req));
        }
        catch (error) {
            requestError(res, error instanceof RangeError ? 413 : 400, 'invalid-request', publicMessage(error));
            return;
        }
        try {
            switch (parsed.action) {
                case 'health':
                    responseJson(res, 200, { ok: true, value: await this.health(parsed, req) });
                    break;
                case 'check-update':
                    responseJson(res, 200, { ok: true, value: await this.updater.check() });
                    break;
                case 'apply-update':
                    responseJson(res, 200, { ok: true, value: await this.updater.installAndRestart(parsed.expectedVersion) });
                    break;
            }
        }
        catch (error) {
            const updateError = error instanceof PluginUpdateError;
            const code = updateError
                ? error.code
                : parsed.action === 'health'
                    ? 'health-failed'
                    : 'settings-rejected';
            const updateConflict = updateError && ['update-in-progress', 'update-stale', 'update-unavailable', 'already-current'].includes(error.code);
            const updateGateway = updateError && error.code === 'update-check-failed';
            const status = updateConflict
                ? 409
                : parsed.action === 'health'
                    ? 503
                    : updateGateway
                        ? 502
                        : updateError
                            ? 500
                            : 400;
            this.ctx.logger.warn('dsh-ark-toolkit Web action=%s failed: %s', parsed.action, publicMessage(error));
            requestError(res, status, code, publicMessage(error));
        }
    }
}
/**
 * Attach optional Web routes whenever a webServer service is present.
 * @param ctx - plugin context owning route effects.
 * @param backend - Settings handler.
 * @param artifacts - signed Artifact handler.
 */
export function installArkToolkitWeb(ctx, backend, artifacts) {
    ctx.inject(['webServer'], (webCtx) => {
        webCtx.effect(() => {
            backend.configureWebServer(webCtx.webServer.host, webCtx.webServer.port);
            const detach = artifacts.attachRoute();
            const disposeArtifact = webCtx.webServer.register({
                kind: 'prefix',
                path: ARTIFACT_ROUTE_PREFIX,
                handler: (req, res) => artifacts.handle(req, res),
            });
            const disposeSettings = webCtx.webServer.register({
                kind: 'exact',
                path: SETTINGS_ROUTE,
                handler: (req, res) => backend.handle(req, res),
            });
            return () => {
                disposeSettings();
                disposeArtifact();
                detach();
            };
        }, 'dsh-ark-toolkit: Web routes');
    });
}
//# sourceMappingURL=web.js.map