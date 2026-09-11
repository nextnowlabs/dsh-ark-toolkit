/**
 * Plugin configuration: provider endpoint and credential reference plus local
 * limits. Secrets never live here — `provider.credential` and
 * `provider.tts.credential` are DSH Credential references resolved per
 * operation through `ctx.credentials`. There is no Python or vendored runtime
 * to locate.
 * @module dsh-ark-toolkit/config
 */
import z from '@deepseek-ai/schemastery';
import { credentialRef } from '@deepseek-ai/dsh-credentials';
import { ArkToolkitError } from "./errors.js";
import { ARK_BASE_URL, ARK_CREDENTIAL, ARK_SEEDREAM_MODEL, SEEDREAM_MODEL_ALIASES, VOLCENGINE_TTS_CREDENTIAL, VOLCENGINE_TTS_RESOURCE, VOLCENGINE_TTS_URL, VOLCENGINE_TTS_VOICE, } from "./defaults.js";
export { ARK_BASE_URL, ARK_CREDENTIAL, ARK_SEEDREAM_MODEL, SEEDREAM_MODEL_ALIASES, VOLCENGINE_TTS_CREDENTIAL, VOLCENGINE_TTS_RESOURCE, VOLCENGINE_TTS_URL, VOLCENGINE_TTS_VOICE, } from "./defaults.js";
/** Settings document namespace owned by this plugin (a plain string, no branded constructor). */
export const ARK_TOOLKIT_SETTINGS_NAMESPACE = 'ark-toolkit';
/** Browser-compatible default User-Agent shared by every outbound request. */
export const DEFAULT_PROVIDER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
/**
 * Resolve a Seedream model alias to its full Volcengine Ark model id, falling
 * back to the raw input so advanced users may pass any Ark model id directly.
 */
export function resolveSeedreamModel(model) {
    const trimmed = model.trim();
    return trimmed.length === 0 ? ARK_SEEDREAM_MODEL : (SEEDREAM_MODEL_ALIASES[trimmed] ?? trimmed);
}
/** Configuration schema with the documented defaults. */
export const Config = z.object({
    provider: z.object({
        baseUrl: z.string().default(ARK_BASE_URL),
        credential: z.string().default(ARK_CREDENTIAL),
        userAgent: z.string().default(DEFAULT_PROVIDER_USER_AGENT),
        tts: z.object({
            baseUrl: z.string().default(VOLCENGINE_TTS_URL),
            credential: z.string().default(VOLCENGINE_TTS_CREDENTIAL),
            resource: z.string().default(VOLCENGINE_TTS_RESOURCE),
            voice: z.string().default(VOLCENGINE_TTS_VOICE),
        }),
    }),
    timeoutMs: z.number().default(600000),
    concurrency: z.number().default(4),
});
const MAX_TIMEOUT_MS = 600000;
const MAX_CONCURRENCY = 16;
/**
 * Validate and normalize a config object (partial inputs receive the same
 * defaults the schemastery schema applies). Configuration mistakes fail loud
 * at plugin load (the earliest resolvable point); runtime availability is a
 * separate, later concern.
 * @param config - parsed config with defaults applied.
 * @returns the fully defaulted, validated configuration.
 */
export function resolveConfig(config = {}) {
    const provider = config.provider ?? {};
    const baseUrl = (provider.baseUrl ?? ARK_BASE_URL).trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(baseUrl) || baseUrl.length <= 'https://'.length) {
        throw new ArkToolkitError('config', 'provider.baseUrl must be an http(s) URL');
    }
    let credential;
    try {
        credential = credentialRef((provider.credential ?? ARK_CREDENTIAL).trim());
    }
    catch (error) {
        throw new ArkToolkitError('config', `provider.credential "${provider.credential ?? ARK_CREDENTIAL}" is not a valid credential reference`, { cause: error });
    }
    const userAgent = (provider.userAgent ?? DEFAULT_PROVIDER_USER_AGENT).trim();
    if (userAgent.length === 0) {
        throw new ArkToolkitError('config', 'provider.userAgent must not be empty');
    }
    const tts = provider.tts ?? {};
    const ttsBaseUrl = (tts.baseUrl ?? VOLCENGINE_TTS_URL).trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(ttsBaseUrl) || ttsBaseUrl.length <= 'https://'.length) {
        throw new ArkToolkitError('config', 'provider.tts.baseUrl must be an http(s) URL');
    }
    let ttsCredential;
    try {
        ttsCredential = credentialRef((tts.credential ?? VOLCENGINE_TTS_CREDENTIAL).trim());
    }
    catch (error) {
        throw new ArkToolkitError('config', `provider.tts.credential "${tts.credential ?? VOLCENGINE_TTS_CREDENTIAL}" is not a valid credential reference`, { cause: error });
    }
    const ttsResource = (tts.resource ?? VOLCENGINE_TTS_RESOURCE).trim();
    if (ttsResource.length === 0) {
        throw new ArkToolkitError('config', 'provider.tts.resource must not be empty');
    }
    const ttsVoice = (tts.voice ?? VOLCENGINE_TTS_VOICE).trim();
    if (ttsVoice.length === 0) {
        throw new ArkToolkitError('config', 'provider.tts.voice must not be empty');
    }
    const timeoutMs = config.timeoutMs ?? 600000;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > MAX_TIMEOUT_MS) {
        throw new ArkToolkitError('config', `timeoutMs must be an integer between 1000 and ${MAX_TIMEOUT_MS}`);
    }
    const concurrency = config.concurrency ?? 4;
    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > MAX_CONCURRENCY) {
        throw new ArkToolkitError('config', `concurrency must be an integer between 1 and ${MAX_CONCURRENCY}`);
    }
    return {
        provider: {
            baseUrl,
            credential,
            userAgent,
            tts: { baseUrl: ttsBaseUrl, credential: ttsCredential, resource: ttsResource, voice: ttsVoice },
        },
        timeoutMs,
        concurrency,
    };
}
//# sourceMappingURL=config.js.map