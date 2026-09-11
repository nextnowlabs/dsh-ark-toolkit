/**
 * Optional Web-profile routes: signed Artifact delivery plus a same-origin
 * Settings/health endpoint. The browser never receives credential values and
 * connection tests run only after an explicit POST action.
 * @module dsh-ark-toolkit/web
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Context } from '@deepseek-ai/cordis';
import { ArtifactAccessController } from './artifact-access.ts';
import { type ArkToolkitConfig } from './config.ts';
import { type PluginUpdateCapability, type PluginUpdateCheck, type PluginUpdateResult } from './plugin-update.ts';
import { ArkToolkitRuntimeManager, type PreparedRuntimeGeneration, type RuntimeManagerStatus } from './runtime-manager.ts';
/** Exact route used by the browser Settings page. */
export declare const SETTINGS_ROUTE = "/_dsh/ark-toolkit/settings";
/** Public Settings snapshot; credential values are deliberately impossible here. */
export interface ArkToolkitSettingsSnapshot {
    schemaVersion: 1;
    writable: boolean;
    settings: {
        value: ArkToolkitConfig;
        user?: unknown;
        base?: unknown;
        revision: number;
        applies: 'live';
    };
    credential: {
        ref: string;
        configured: boolean;
        source?: string;
        writable: boolean;
    };
    credentialTts: {
        ref: string;
        configured: boolean;
        source?: string;
        writable: boolean;
    };
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
    prepareCandidate(raw: ArkToolkitConfig): Promise<PreparedRuntimeGeneration>;
    activateCandidate(candidate: PreparedRuntimeGeneration): void;
    recordFailure(error: unknown): void;
    status(): RuntimeManagerStatus;
}
/** Minimal self-update face used by the Web route and its tests. */
export interface WebPluginUpdater {
    configureWebServer?(host: string, port: number): void;
    capability(): Promise<PluginUpdateCapability>;
    check(): Promise<PluginUpdateCheck>;
    installAndRestart(expectedVersion: string): Promise<PluginUpdateResult>;
}
/** Callback invoked when a Settings save makes the first runtime available. */
export type RuntimeActivated = () => void;
/** Same-origin Settings and health handler. */
export declare class ArkToolkitWebBackend {
    private readonly ctx;
    private readonly manager;
    private readonly artifacts;
    private readonly onRuntimeActivated;
    private readonly updater;
    constructor(ctx: Context, manager: WebRuntimeManager, artifacts: ArtifactAccessController, onRuntimeActivated: RuntimeActivated, updater?: WebPluginUpdater);
    /** Supply the active listener address before the Settings route becomes reachable. */
    configureWebServer(host: string, port: number): void;
    private credential;
    private credentialTts;
    /** Build the current settings/runtime/credential snapshot without secrets. */
    snapshot(): Promise<ArkToolkitSettingsSnapshot>;
    private save;
    private saveCredential;
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