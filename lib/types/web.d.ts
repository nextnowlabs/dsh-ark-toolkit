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
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Context } from '@deepseek-ai/cordis';
import { ArtifactAccessController } from './artifact-access.ts';
import { type PluginUpdateCapability, type PluginUpdateCheck, type PluginUpdateResult } from './plugin-update.ts';
import type { ArkToolkitRuntimeManager, RuntimeManagerStatus } from './runtime-manager.ts';
/** Exact route the browser page posts its actions to. */
export declare const SETTINGS_ROUTE = "/_dsh/ark-toolkit/settings";
/** Public action snapshot; credential values are deliberately impossible here. */
export interface ArkToolkitSettingsSnapshot {
    schemaVersion: 1;
    runtime: RuntimeManagerStatus;
    release: {
        pluginVersion: string;
        update: PluginUpdateCapability;
    };
    artifactRouteAvailable: boolean;
}
/** Minimal runtime-manager face used by the Web route and its tests. */
export interface WebRuntimeManager {
    readonly ready: boolean;
    current(): ReturnType<ArkToolkitRuntimeManager['current']>;
    status(): RuntimeManagerStatus;
}
/** Minimal self-update face used by the Web route and its tests. */
export interface WebPluginUpdater {
    configureWebServer?(host: string, port: number): void;
    capability(): Promise<PluginUpdateCapability>;
    check(): Promise<PluginUpdateCheck>;
    installAndRestart(expectedVersion: string): Promise<PluginUpdateResult>;
}
/** Same-origin Settings and health handler. */
export declare class ArkToolkitWebBackend {
    private readonly ctx;
    private readonly manager;
    private readonly artifacts;
    private readonly updater;
    constructor(ctx: Context, manager: WebRuntimeManager, artifacts: ArtifactAccessController, updater?: WebPluginUpdater);
    /** Supply the active listener address before the Settings route becomes reachable. */
    configureWebServer(host: string, port: number): void;
    /** Build the current runtime/update snapshot without secrets. */
    snapshot(): Promise<ArkToolkitSettingsSnapshot>;
    private health;
    /** Handle the exact Settings route. */
    handle(req: IncomingMessage, res: ServerResponse): Promise<void>;
}
/**
 * Attach optional Web routes whenever a webServer service is present.
 * @param ctx - plugin context owning route effects.
 * @param backend - Settings handler.
 * @param artifacts - signed Artifact handler.
 */
export declare function installArkToolkitWeb(ctx: Context, backend: ArkToolkitWebBackend, artifacts: ArtifactAccessController): void;
//# sourceMappingURL=web.d.ts.map