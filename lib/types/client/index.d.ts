/**
 * DSH Ark Toolkit browser plugin: dedicated Tool cards plus the bundle
 * configuration card on the bundle's page in the Plugins panel, with health
 * checks, connection tests, and safe Artifact previews.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-chat/client';
declare const en: {
    readonly settingsTitle: "Volcengine Ark Toolkit";
    readonly settingsIntro: "Configure the ByteDance models and API keys used by image generation and speech synthesis.";
    readonly collapse: "Collapse";
    readonly expand: "Expand";
    readonly externalNotice: "Image generation (ark_generate_image) and speech synthesis (ark_speak) send your prompt or text to the configured ByteDance services; the resulting file is written into the session workspace.";
    readonly ark: "Ark image generation";
    readonly arkHint: "Doubao Seedream model and Ark API key used by the ark_generate_image tool.";
    readonly arkTutorial: "Getting a Volcengine Ark API key and calling Doubao Seedream: step-by-step tutorial →";
    readonly baseUrl: "Base URL";
    readonly apiKey: "API key";
    readonly apiKeyPlaceholderMissing: "Paste the API key";
    readonly apiKeyPlaceholderConfigured: "Saved; leave blank to keep it";
    readonly apiKeyHint: "The key is stored in DSH Credentials and is never shown again after saving.";
    readonly apiKeyLocked: "The current key comes from a read-only source and cannot be replaced here.";
    readonly apiKeyBlank: "The API key cannot contain only spaces.";
    readonly apiKeyInvalid: "Paste only the key, without a variable name, quotes, spaces, or line breaks.";
    readonly credential: "Credential name";
    readonly credentialHint: "This is the DSH credential reference that stores the Volcengine Ark API key used by image generation.";
    readonly model: "Seedream model";
    readonly modelHint: "The ark_generate_image default; a tool call can still override it per request.";
    readonly userAgent: "User-Agent";
    readonly tts: "Speech (TTS)";
    readonly ttsHint: "ByteDance Volcengine Speech service used by the ark_speak tool, with its own app token independent of the Ark key.";
    readonly ttsBaseUrl: "TTS base URL";
    readonly ttsCredential: "TTS credential name";
    readonly ttsResource: "TTS resource / App ID";
    readonly ttsVoice: "Default voice";
    readonly ttsKey: "TTS app token";
    readonly ttsKeyHint: "The token is stored in DSH Credentials and is never shown again after saving.";
    readonly limits: "Limits";
    readonly timeout: "Request timeout (ms)";
    readonly concurrency: "Concurrent calls per session";
    readonly save: "Save and apply";
    readonly saving: "Validating runtime…";
    readonly reload: "Reload";
    readonly saved: "Settings validated and applied.";
    readonly readOnly: "Service settings are read-only. A writable API key can still be saved.";
    readonly configured: "Configured";
    readonly missing: "Missing";
    readonly source: "Source";
    readonly sourceHint: "{source}: {value}";
    readonly sourceEnv: "Environment variable";
    readonly sourceFile: "Credential file";
    readonly health: "Health";
    readonly runHealth: "Run health check";
    readonly testConnection: "Test API connection";
    readonly testing: "Checking…";
    readonly connectionHint: "The health check inspects local readiness. The API connection test only queries GET /models on the configured Ark endpoint.";
    readonly saveBeforeTesting: "Save service changes before testing the connection.";
    readonly advanced: "Advanced settings";
    readonly advancedHint: "Credential names, endpoints, User-Agent, and request limits. Most users never need these.";
    readonly pluginVersion: "Plugin";
    readonly activeGeneration: "Runtime generation";
    readonly activeGenerationValue: "Generation {generation}";
    readonly updates: "Plugin updates";
    readonly updatesHint: "Check npm for a newer release, install it into this DSH profile, and restart DSH Web automatically.";
    readonly manualUpdate: "Manual update";
    readonly manualUpdateHint: "Run this command in your terminal to install the latest release into this DSH profile.";
    readonly copy: "Copy";
    readonly copied: "Copied";
    readonly checkUpdate: "Check for updates";
    readonly checkingUpdate: "Checking for updates…";
    readonly updateAvailable: "Update available";
    readonly updateAvailableDetail: "Version {version} is available. It will restart DSH Web automatically when safe; otherwise you will be asked to restart it manually.";
    readonly upToDate: "Up to date";
    readonly upToDateDetail: "Version {version} is the latest release.";
    readonly updateNow: "Install update";
    readonly updatingPlugin: "Installing update…";
    readonly updateConfirm: "Install Ark Toolkit {version} now? DSH Web will restart automatically when supported; otherwise a manual restart will be required.";
    readonly restarting: "Version {version} was installed. Waiting for DSH Web to restart…";
    readonly manualRestartRequired: "Version {version} was installed. Restart DSH Web through your usual command or process manager to activate it.";
    readonly updateProfile: "Profile";
    readonly updateInstalled: "Installed";
    readonly updateLatest: "Latest";
    readonly updateUnsupported: "In-app updates are unavailable for this installation.";
    readonly updateReasonProfileNotFound: "The running plugin could not be matched to a DSH profile installation.";
    readonly updateReasonNotDependency: "The plugin is not a direct dependency of this DSH profile.";
    readonly updateReasonLocalSource: "This profile uses a local, workspace, URL, or git installation; update that source manually so local work is not overwritten.";
    readonly updateReasonReadOnly: "The profile package manifest is read-only.";
    readonly updateReasonPnpm: "pnpm is unavailable in the DSH execution environment.";
    readonly updateReasonPlatform: "Automatic restart is unavailable on this operating system.";
    readonly updateReasonRestartUnmanaged: "Detached self-restart is disabled. Use a supported process manager, or explicitly opt in with DSH_ARK_TOOLKIT_ALLOW_DETACHED_RESTART=1 for an unsupervised Web process.";
    readonly updateReasonRestartAddress: "Automatic restart is unavailable when DSH Web uses an unknown or dynamically allocated port. Start it with a fixed --port value.";
    readonly updateSaveFirst: "Save or discard the current Settings and API key changes before updating the plugin.";
    readonly restartTimedOut: "DSH Web did not return with the target plugin version. Check the restart log and restart the Web profile through its original process manager.";
    readonly restartRolledBack: "The new plugin did not become ready, so the previous version was restored. Check the restart log before trying again.";
    readonly runtimeUnavailable: "Runtime unavailable";
    readonly runtimeCandidateRejected: "Last runtime candidate was rejected; the active generation remains available.";
    readonly runtimeReady: "Ready";
    readonly runtimePureNode: "Pure Node";
    readonly retry: "Retry";
    readonly open: "Open file";
    readonly download: "Download";
    readonly previewUnavailable: "HTTP preview is unavailable in this host; use Open file.";
    readonly running: "Running…";
    readonly failed: "Failed";
    readonly artifact: "Artifact";
    readonly artifacts: "Artifacts";
    readonly noResult: "Structured result unavailable; inspect the raw Tool result.";
    readonly healthy: "Healthy";
    readonly degraded: "Needs attention";
    readonly notTested: "Not tested";
    readonly generateImageTitle: "Generated image";
    readonly speakTitle: "Synthesized speech";
    readonly artifactTitle: "Ark Artifact";
    readonly artifactSeedreamImage: "Seedream generated image";
    readonly artifactTtsSpeech: "ByteDance TTS synthesized speech";
    readonly healthCredential: "Ark credential";
    readonly healthTtsCredential: "TTS credential";
    readonly healthArtifactDirectory: "Artifact directory";
    readonly healthService: "Ark service";
    readonly statusOk: "OK";
    readonly statusWarning: "Warning";
    readonly statusError: "Error";
    readonly statusNotTested: "Not tested";
    readonly positiveInteger: "{field} must be a positive integer.";
    readonly healthCredentialMissing: "Credential {credential} is not configured.";
    readonly healthCredentialReady: "Credential {credential} is available.";
    readonly healthCredentialFailed: "Could not read credential {credential}.";
    readonly healthDirectoryWritable: "{directory} is writable: {path}";
    readonly healthDirectoryNotWritable: "{directory} is not writable: {path}";
    readonly healthArtifactDirectoryFailed: "Could not prepare the artifact directory.";
    readonly healthConnectionNotTested: "API connection not tested. Use Test API connection to query /models.";
    readonly healthConnectionCredentialMissing: "Connection test skipped because the credential is unavailable.";
    readonly healthServiceResponded: "Service responded at {endpoint} (HTTP {status}).";
    readonly healthServiceRejectedCredential: "Service rejected the configured credential (HTTP {status}).";
    readonly healthServiceForbidden: "Service is reachable, but GET /models is restricted (HTTP {status}). This is often an account or model-list permission limit, not an invalid key.";
    readonly healthServiceNoModels: "Service is reachable but does not support GET /models (HTTP {status}).";
    readonly healthServiceRateLimited: "Service is reachable, but the connection test was rate-limited (HTTP 429).";
    readonly healthServiceHttpFailed: "Connection test failed with HTTP {status}.";
    readonly healthServiceUnreachable: "Could not reach {endpoint}.";
};
type LocaleKey = keyof typeof en;
interface ToolCallOwnerProps {
    callId: string;
    toolName: string;
    block: ToolCallBlock;
    cwd?: string | undefined;
    openFile: (path: string) => void;
    inspect?: (() => void) | undefined;
}
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface SlotMap {
        /** Keyed atomic Tool call view, dispatched by wire Tool name. */
        'tool.call.toolview': {
            kind: 'keyed';
            scope: 'session';
            owner: ToolCallOwnerProps;
        };
        /**
         * This bundle's own configuration, keyed by its package name and rendered
         * on the bundle's page in the Plugins panel. DSH `0.1.6` replaced the
         * former `settings.plugin.item` seat (a card in the retired
         * 设置 → 插件 → 插件配置 tab) with the plugin-manager page's bundle slot,
         * so the card moved here; the page draws the title, icon, and crumb itself
         * and asks for `page` (the form) or `summary` (its one-liner).
         */
        'plugins.bundle.config': {
            kind: 'keyed';
            scope: 'root';
            owner: PluginConfigViewProps;
        };
    }
    /** Owner share of one configuration view; the page supplies the requested view. */
    interface PluginConfigViewProps {
        /** `summary` renders the one-liner alone; `page` renders the form. */
        readonly view: 'summary' | 'page';
    }
    interface LocaleNamespaceMap {
        /** DSH Ark Toolkit Tool cards and Settings copy. */
        'ark-toolkit': LocaleKey;
    }
}
interface HealthCheck {
    status: 'ok' | 'warning' | 'error' | 'not_tested';
    detail: string;
}
interface HealthResult {
    pluginVersion: string;
    checks: Record<string, HealthCheck>;
    healthy: boolean;
    connectionTested: boolean;
}
interface SettingsValue {
    provider?: {
        baseUrl?: string;
        credential?: string;
        userAgent?: string;
        tts?: {
            baseUrl?: string;
            credential?: string;
            resource?: string;
            voice?: string;
        };
    };
    timeoutMs?: number;
    concurrency?: number;
}
type PluginUpdateUnavailableReason = 'profile-not-found' | 'not-direct-dependency' | 'unsupported-install-source' | 'profile-read-only' | 'pnpm-unavailable' | 'unsupported-platform' | 'restart-unmanaged' | 'restart-address-unavailable';
interface PluginUpdateCapability {
    supported: boolean;
    checkSupported?: boolean;
    profile?: string;
    dependencySpec?: string;
    reason?: PluginUpdateUnavailableReason;
}
interface PluginUpdateCheck extends PluginUpdateCapability {
    currentVersion: string;
    latestVersion?: string;
    updateAvailable: boolean;
    checkedAt: string;
}
type PluginUpdateResult = {
    fromVersion: string;
    toVersion: string;
    profile: string;
    restarting: true;
    retryAfterMs: number;
    manualRestartRequired?: false;
} | {
    fromVersion: string;
    toVersion: string;
    profile: string;
    restarting: false;
    manualRestartRequired: true;
    retryAfterMs?: undefined;
};
interface SettingsSnapshot {
    schemaVersion: 1;
    writable: boolean;
    settings: {
        value: SettingsValue;
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
    runtime: {
        ready: boolean;
        generation: number;
        activeConfig?: SettingsValue;
        lastError?: string;
    };
    release: {
        pluginVersion: string;
        update: PluginUpdateCapability;
    };
    artifactRouteAvailable: boolean;
}
/** Decode canonical presentation metadata with a JSON-text fallback. */
export declare function decodeArkResult(block: ToolCallBlock): Record<string, unknown> | undefined;
interface SettingsState {
    status: 'idle' | 'loading' | 'ready' | 'error';
    snapshot?: SettingsSnapshot | undefined;
    health?: HealthResult | undefined;
    update?: PluginUpdateCheck | undefined;
    restart?: PluginUpdateResult | undefined;
    action?: 'save' | 'health' | 'connection' | 'check-update' | 'apply-update' | undefined;
    message?: string | undefined;
    error?: string | undefined;
}
/** Small external store shared by the Settings route and pushed invalidations. */
export declare class ArkSettingsController {
    private state;
    private listeners;
    private generation;
    subscribe: (listener: () => void) => (() => void);
    snapshot: () => SettingsState;
    private set;
    load(): Promise<void>;
    refreshIfLoaded(): void;
    save(value: SettingsValue, expectedRevision: number, credentialValue: string | undefined, credentialTtsValue: string | undefined, writeSettings: boolean): Promise<boolean>;
    runHealth(mode: 'health' | 'connection'): Promise<void>;
    checkUpdate(): Promise<void>;
    applyUpdate(expectedVersion: string): Promise<void>;
    reportRestartTimeout(message: string): void;
}
/** Required client services. */
export declare const inject: string[];
/** Register dedicated Tool views and the Ark Toolkit plugin-configuration card. */
export declare function apply(ctx: ClientContext): void;
export {};
//# sourceMappingURL=index.d.ts.map