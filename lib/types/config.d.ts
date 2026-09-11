/**
 * Plugin configuration: provider endpoint and credential reference plus local
 * limits. Secrets never live here — `provider.credential` and
 * `provider.tts.credential` are DSH Credential references resolved per
 * operation through `ctx.credentials`. There is no Python or vendored runtime
 * to locate.
 * @module dsh-ark-toolkit/config
 */
import type Schema from '@deepseek-ai/schemastery';
import { type CredentialRef } from '@deepseek-ai/dsh-credentials';
export { ARK_BASE_URL, ARK_CREDENTIAL, ARK_SEEDREAM_MODEL, SEEDREAM_MODEL_ALIASES, VOLCENGINE_TTS_CREDENTIAL, VOLCENGINE_TTS_RESOURCE, VOLCENGINE_TTS_URL, VOLCENGINE_TTS_VOICE, } from './defaults.ts';
/** Settings document namespace owned by this plugin (a plain string, no branded constructor). */
export declare const ARK_TOOLKIT_SETTINGS_NAMESPACE: "ark-toolkit";
/** Browser-compatible default User-Agent shared by every outbound request. */
export declare const DEFAULT_PROVIDER_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
/**
 * Resolve a Seedream model alias to its full Volcengine Ark model id, falling
 * back to the raw input so advanced users may pass any Ark model id directly.
 */
export declare function resolveSeedreamModel(model: string): string;
/** Full user-facing configuration; every field defaults at the schema boundary. */
export interface ArkToolkitConfig {
    provider?: {
        /** Ark API base URL used by the `ark_generate_image` tool. */
        baseUrl?: string;
        /** DSH Credential reference holding the Ark API key (an environment-style name). */
        credential?: string;
        /** Outbound User-Agent for Ark and Volcengine requests. */
        userAgent?: string;
        /**
         * Volcengine Speech TTS (ByteDance) settings for the `ark_speak` tool.
         * This uses the standalone `openspeech.bytedance.com` TTS V3 service with
         * its own API key credential and resource id, independent of the Ark key.
         */
        tts?: {
            /** Volcengine Speech TTS V3 endpoint. */
            baseUrl?: string;
            /** DSH Credential reference holding the TTS API key (an environment-style name). */
            credential?: string;
            /** TTS resource/app id, e.g. `seed-tts-2.0`. */
            resource?: string;
            /** Default voice id from the official 在线音色列表. */
            voice?: string;
        };
    };
    /** Single remote/upstream call budget in milliseconds. */
    timeoutMs?: number;
    /** In-flight tool execution cap per session. */
    concurrency?: number;
}
/** Configuration schema with the documented defaults. */
export declare const Config: Schema<ArkToolkitConfig>;
/** Configuration after static validation, with every default materialized. */
export interface ResolvedArkToolkitConfig {
    provider: {
        baseUrl: string;
        credential: CredentialRef;
        userAgent: string;
        tts: {
            baseUrl: string;
            credential: CredentialRef;
            resource: string;
            voice: string;
        };
    };
    timeoutMs: number;
    concurrency: number;
}
/**
 * Validate and normalize a config object (partial inputs receive the same
 * defaults the schemastery schema applies). Configuration mistakes fail loud
 * at plugin load (the earliest resolvable point); runtime availability is a
 * separate, later concern.
 * @param config - parsed config with defaults applied.
 * @returns the fully defaulted, validated configuration.
 */
export declare function resolveConfig(config?: ArkToolkitConfig): ResolvedArkToolkitConfig;
//# sourceMappingURL=config.d.ts.map