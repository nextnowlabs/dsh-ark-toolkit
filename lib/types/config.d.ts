/**
 * Plugin configuration: provider endpoint and credential reference plus local
 * limits. Secrets never live here — `provider.credential` and
 * `provider.tts.credential` are DSH Credential references resolved per
 * operation through `ctx.credentials`. There is no Python or vendored runtime
 * to locate.
 * @module dsh-ark-toolkit/config
 */
import type { Volatile } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type CredentialRef } from '@deepseek-ai/dsh-credentials';
export { ARK_BASE_URL, ARK_CREDENTIAL, ARK_SEEDREAM_MODEL, SEEDREAM_MODEL_ALIASES, VOLCENGINE_TTS_CREDENTIAL, VOLCENGINE_TTS_RESOURCE, VOLCENGINE_TTS_URL, VOLCENGINE_TTS_VOICE, } from './defaults.ts';
/**
 * Id of the profile entry that loads this bundle, as this bundle's own
 * `cordis.patch.yml` declares it. DSH `0.1.7` addresses a plugin's
 * configuration by that id, so it is also the settings namespace a form write
 * names. The browser half declares the same literal as `ENTRY_ID` — the two
 * halves compile separately, so neither can import the other, and the two
 * declarations must stay identical.
 */
export declare const ARK_TOOLKIT_ENTRY_ID = "ark-toolkit";
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
/**
 * Live plugin Config as `apply` receives it: every field is a stable reference
 * the Loader updates in place, so a Settings write changes the running plugin's
 * configuration without disposing and remounting it.
 */
export interface ArkToolkitConfigRefs {
    /** Ark/TTS provider endpoints and credential references. */
    provider: Volatile<ArkToolkitConfig['provider']>;
    /** Per-call upstream budget in milliseconds. */
    timeoutMs: Volatile<number>;
    /** In-flight tool execution cap per session. */
    concurrency: Volatile<number>;
}
/**
 * Configuration schema with the documented defaults. Every field is declared
 * `volatile()`: DSH only accepts a live form write on a field beneath a
 * volatile node, and the plugin rebuilds its runtime from the references
 * instead of waiting for a remount.
 */
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    provider: z<NoInfer<Schemastery.ObjectS<NoInfer<{
        baseUrl: z<string, string, "defined">;
        credential: z<string, string, "defined">;
        userAgent: z<string, string, "defined">;
        tts: z<Schemastery.ObjectS<NoInfer<{
            baseUrl: z<string, string, "defined">;
            credential: z<string, string, "defined">;
            resource: z<string, string, "defined">;
            voice: z<string, string, "defined">;
        }>>, Schemastery.ObjectT<NoInfer<{
            baseUrl: z<string, string, "defined">;
            credential: z<string, string, "defined">;
            resource: z<string, string, "defined">;
            voice: z<string, string, "defined">;
        }>>, "plain">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        baseUrl: z<string, string, "defined">;
        credential: z<string, string, "defined">;
        userAgent: z<string, string, "defined">;
        tts: z<Schemastery.ObjectS<NoInfer<{
            baseUrl: z<string, string, "defined">;
            credential: z<string, string, "defined">;
            resource: z<string, string, "defined">;
            voice: z<string, string, "defined">;
        }>>, Schemastery.ObjectT<NoInfer<{
            baseUrl: z<string, string, "defined">;
            credential: z<string, string, "defined">;
            resource: z<string, string, "defined">;
            voice: z<string, string, "defined">;
        }>>, "plain">;
    }>>>, "volatile">;
    timeoutMs: z<number, number, "volatile-defined">;
    concurrency: z<number, number, "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    provider: z<NoInfer<Schemastery.ObjectS<NoInfer<{
        baseUrl: z<string, string, "defined">;
        credential: z<string, string, "defined">;
        userAgent: z<string, string, "defined">;
        tts: z<Schemastery.ObjectS<NoInfer<{
            baseUrl: z<string, string, "defined">;
            credential: z<string, string, "defined">;
            resource: z<string, string, "defined">;
            voice: z<string, string, "defined">;
        }>>, Schemastery.ObjectT<NoInfer<{
            baseUrl: z<string, string, "defined">;
            credential: z<string, string, "defined">;
            resource: z<string, string, "defined">;
            voice: z<string, string, "defined">;
        }>>, "plain">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        baseUrl: z<string, string, "defined">;
        credential: z<string, string, "defined">;
        userAgent: z<string, string, "defined">;
        tts: z<Schemastery.ObjectS<NoInfer<{
            baseUrl: z<string, string, "defined">;
            credential: z<string, string, "defined">;
            resource: z<string, string, "defined">;
            voice: z<string, string, "defined">;
        }>>, Schemastery.ObjectT<NoInfer<{
            baseUrl: z<string, string, "defined">;
            credential: z<string, string, "defined">;
            resource: z<string, string, "defined">;
            voice: z<string, string, "defined">;
        }>>, "plain">;
    }>>>, "volatile">;
    timeoutMs: z<number, number, "volatile-defined">;
    concurrency: z<number, number, "volatile-defined">;
}>>, "plain">;
/**
 * Read the plain configuration currently behind every reference.
 * @param config - live plugin Config.
 * @returns a detached snapshot safe to validate, fingerprint, or persist.
 */
export declare function readArkToolkitConfig(config: ArkToolkitConfigRefs): ArkToolkitConfig;
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