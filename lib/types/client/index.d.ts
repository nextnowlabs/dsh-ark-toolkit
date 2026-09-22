/**
 * DSH Ark Toolkit browser plugin: dedicated Tool cards plus the plugin's own
 * configuration page in the Plugins panel, with health checks, connection
 * tests, plugin updates, and safe Artifact previews.
 *
 * DSH `0.1.7` made one plugin entry's `config` its settings, reachable from the
 * browser through `ctx.configForms` and written through the Remote settings
 * namespace. This client therefore keeps no configuration route of its own:
 * the page stages drafts, the form model turns them into path-addressed
 * mutations, and credentials ride the credentials domain.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type SettingsFormShell } from '@deepseek-ai/dsh-client-ui-primitives';
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
    readonly unavailable: "This profile does not serve the Ark Toolkit configuration entry.";
    readonly saveFailed: "The Host did not accept the staged changes.";
    readonly overridden: "overridden";
    readonly reset: "reset";
    readonly invalidNumber: "Enter a whole number.";
    readonly baseUrlHint: "Ark API base URL; /images/generations is appended.";
    readonly userAgentHint: "Outbound User-Agent for Ark and Volcengine requests.";
    readonly ttsBaseUrlHint: "Volcengine Speech TTS V3 endpoint.";
    readonly ttsResourceHint: "TTS resource / app id, e.g. seed-tts-2.0.";
    readonly ttsVoiceHint: "Default voice id. A tool call may override it per request.";
    readonly timeoutHint: "Per-call upstream budget in milliseconds (1000-600000).";
    readonly concurrencyHint: "In-flight Ark tool executions per session (1-16).";
    readonly credentialRefHint: "DSH Credential reference holding the Ark API key. The key itself is stored in DSH Credentials and is never shown again after saving.";
    readonly ttsCredentialRefHint: "DSH Credential reference holding the TTS token, independent of the Ark API key.";
    readonly modelReadOnly: "Model";
    readonly modelReadOnlyHint: "Seedream aliases are resolved by the tool; this page does not change them.";
    readonly apiKeyHidden: "The API key is stored in DSH Credentials and is never shown again after saving.";
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
    }
    interface LocaleNamespaceMap {
        /** DSH Ark Toolkit Tool cards and configuration-page copy. */
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
/** Decode canonical presentation metadata with a JSON-text fallback. */
export declare function decodeArkResult(block: ToolCallBlock): Record<string, unknown> | undefined;
/** Health/update action state: everything this page does that is not a config write. */
interface HostActionState {
    health?: HealthResult | undefined;
    update?: PluginUpdateCheck | undefined;
    restart?: PluginUpdateResult | undefined;
    action?: 'health' | 'connection' | 'check-update' | 'apply-update' | undefined;
    message?: 'restarting' | 'manual-restart-required' | undefined;
    error?: string | undefined;
    /** Restart-watch failure, kept as a dictionary key so the page translates it. */
    restartError?: 'restartTimedOut' | 'restartRolledBack' | undefined;
}
/** One control as the platform fields render it. */
interface StagedField {
    text: string;
    overridden: boolean;
    invalid: boolean;
}
/** What the credentials domain last answered for one reference. */
interface CredentialView {
    ref: string;
    configured: boolean;
    source?: string | undefined;
    writable: boolean;
}
/** The runtime facts the Host reports for the serving generation. */
interface RuntimeStatus {
    ready: boolean;
    generation: number;
    lastError?: string | undefined;
}
/** Everything this page renders, rebuilt whenever the form or an action changes. */
interface PageState extends SettingsFormShell {
    status: 'loading' | 'ready' | 'unavailable';
    release: {
        pluginVersion: string;
        update: PluginUpdateCapability;
    };
    runtime: RuntimeStatus;
    credential: CredentialView;
    credentialTts: CredentialView;
    fields: Record<string, StagedField>;
    keyError?: LocaleKey | undefined;
    host: HostActionState;
}
/**
 * The Ark Toolkit page's controller: the staged drafts over this plugin's own
 * profile entry, the credentials its section references, and the Host actions
 * (health checks and plugin updates) that are not configuration writes.
 *
 * Drafts are staged and written only on save, because every settings write is a
 * durable revision-fenced document mutation: a control that committed as it
 * settled would turn one edit into a write the user never asked for.
 */
export declare class ArkToolkitPageController {
    private readonly ctx;
    private readonly scope;
    private readonly unsubscribe;
    private readonly listeners;
    private state;
    private readonly drafts;
    private saving;
    private failed;
    private credential;
    private credentialTts;
    private keyError;
    private host;
    private restartPoll;
    constructor(ctx: ClientContext);
    subscribe: (listener: () => void) => (() => void);
    snapshot: () => PageState;
    private publish;
    /** Rebuild the whole page state from the form snapshot, the credentials, and the Host actions. */
    private projection;
    private shell;
    /** One control's staged text, whether a save would leave an override, and whether it is invalid. */
    private fieldOf;
    private formatValue;
    /** Turn one draft into a write, a clear, or a rejection. */
    private parseField;
    /** Every section edit a save would write. An unparseable draft contributes nothing and blocks the save. */
    private plannedOps;
    /** Every credential literal a save would write, addressed by the reference in force. */
    private plannedSecrets;
    /** The Ark credential reference this section names, staged value first. */
    private arkRef;
    /** The TTS credential reference this section names, staged value first. */
    private ttsRef;
    private refOf;
    /** Stage draft text for one control. */
    edit(field: string, text: string): void;
    /** Stage a clear, so saving lets the field re-inherit the composition layer. */
    resetField(field: string): void;
    /** Drop every staged edit. */
    discard(): void;
    /**
     * Write every staged edit: the section mutations first, so a changed
     * credential reference is in force, then the credential literals themselves.
     */
    save(): Promise<void>;
    /** Read the runtime facts and update capability the Host route reports. */
    private loadHost;
    private release;
    private runtime;
    /**
     * Ask the credentials domain about both references the section names.
     *
     * Every answer is published only while it still describes the reference in
     * force: an edit can change the reference between a request and its response,
     * and two reads can settle out of order.
     */
    private readCredentials;
    private readCredential;
    /**
     * Re-read after the Host reports a change to one reference.
     * @param ref - the credential reference the Host reports as changed.
     */
    refreshCredential(ref: string): void;
    runHealth(mode: 'health' | 'connection'): Promise<void>;
    checkUpdate(): Promise<void>;
    applyUpdate(expectedVersion: string): Promise<void>;
    /**
     * Poll the Host until the replacement process serves the new version, and
     * reload the page once it does. A profile that came back on the old version
     * rolled the update back; the deadline covers a restart that never lands.
     */
    private watchRestart;
    private reportRestartTimeout;
    /** Release the form subscription and any restart poll. */
    dispose(): void;
}
/** Required client services. */
/**
 * Required client services: the slot registry, the locale registry, the Remote
 * domain (with its `credentials` namespace), and the shared configuration forms
 * keyed by profile entry id.
 */
export declare const inject: string[];
/** Register dedicated Tool views and this plugin's configuration page. */
export declare function apply(ctx: ClientContext): void;
export {};
//# sourceMappingURL=index.d.ts.map