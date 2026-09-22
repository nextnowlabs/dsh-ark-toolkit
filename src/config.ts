/**
 * Plugin configuration: provider endpoint and credential reference plus local
 * limits. Secrets never live here — `provider.credential` and
 * `provider.tts.credential` are DSH Credential references resolved per
 * operation through `ctx.credentials`. There is no Python or vendored runtime
 * to locate.
 * @module dsh-ark-toolkit/config
 */

import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { credentialRef, type CredentialRef } from '@deepseek-ai/dsh-credentials'
import { ArkToolkitError } from './errors.ts'
import {
  ARK_BASE_URL,
  ARK_CREDENTIAL,
  ARK_SEEDREAM_MODEL,
  SEEDREAM_MODEL_ALIASES,
  VOLCENGINE_TTS_CREDENTIAL,
  VOLCENGINE_TTS_RESOURCE,
  VOLCENGINE_TTS_URL,
  VOLCENGINE_TTS_VOICE,
} from './defaults.ts'

export {
  ARK_BASE_URL,
  ARK_CREDENTIAL,
  ARK_SEEDREAM_MODEL,
  SEEDREAM_MODEL_ALIASES,
  VOLCENGINE_TTS_CREDENTIAL,
  VOLCENGINE_TTS_RESOURCE,
  VOLCENGINE_TTS_URL,
  VOLCENGINE_TTS_VOICE,
} from './defaults.ts'

/**
 * Id of the profile entry that loads this bundle, as this bundle's own
 * `cordis.patch.yml` declares it. DSH `0.1.7` addresses a plugin's
 * configuration by that id, so it is also the settings namespace a form write
 * names. The browser half declares the same literal as `ENTRY_ID` — the two
 * halves compile separately, so neither can import the other, and the two
 * declarations must stay identical.
 */
export const ARK_TOOLKIT_ENTRY_ID = 'ark-toolkit'

/** Browser-compatible default User-Agent shared by every outbound request. */
export const DEFAULT_PROVIDER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

/**
 * Resolve a Seedream model alias to its full Volcengine Ark model id, falling
 * back to the raw input so advanced users may pass any Ark model id directly.
 */
export function resolveSeedreamModel(model: string): string {
  const trimmed = model.trim()
  return trimmed.length === 0 ? ARK_SEEDREAM_MODEL : (SEEDREAM_MODEL_ALIASES[trimmed] ?? trimmed)
}

/** Full user-facing configuration; every field defaults at the schema boundary. */
export interface ArkToolkitConfig {
  provider?: {
    /** Ark API base URL used by the `ark_generate_image` tool. */
    baseUrl?: string
    /** DSH Credential reference holding the Ark API key (an environment-style name). */
    credential?: string
    /** Outbound User-Agent for Ark and Volcengine requests. */
    userAgent?: string
    /**
     * Volcengine Speech TTS (ByteDance) settings for the `ark_speak` tool.
     * This uses the standalone `openspeech.bytedance.com` TTS V3 service with
     * its own API key credential and resource id, independent of the Ark key.
     */
    tts?: {
      /** Volcengine Speech TTS V3 endpoint. */
      baseUrl?: string
      /** DSH Credential reference holding the TTS API key (an environment-style name). */
      credential?: string
      /** TTS resource/app id, e.g. `seed-tts-2.0`. */
      resource?: string
      /** Default voice id from the official 在线音色列表. */
      voice?: string
    }
  }
  /** Single remote/upstream call budget in milliseconds. */
  timeoutMs?: number
  /** In-flight tool execution cap per session. */
  concurrency?: number
}

/**
 * Live plugin Config as `apply` receives it: every field is a stable reference
 * the Loader updates in place, so a Settings write changes the running plugin's
 * configuration without disposing and remounting it.
 */
export interface ArkToolkitConfigRefs {
  /** Ark/TTS provider endpoints and credential references. */
  provider: Volatile<ArkToolkitConfig['provider']>
  /** Per-call upstream budget in milliseconds. */
  timeoutMs: Volatile<number>
  /** In-flight tool execution cap per session. */
  concurrency: Volatile<number>
}

/**
 * Configuration schema with the documented defaults. Every field is declared
 * `volatile()`: DSH only accepts a live form write on a field beneath a
 * volatile node, and the plugin rebuilds its runtime from the references
 * instead of waiting for a remount.
 */
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
  }).volatile(),
  timeoutMs: z.number().default(600000).volatile(),
  concurrency: z.number().default(4).volatile(),
})

/**
 * Read the plain configuration currently behind every reference.
 * @param config - live plugin Config.
 * @returns a detached snapshot safe to validate, fingerprint, or persist.
 */
export function readArkToolkitConfig(config: ArkToolkitConfigRefs): ArkToolkitConfig {
  const provider = config.provider.get()
  return {
    ...(provider === undefined ? {} : { provider }),
    timeoutMs: config.timeoutMs.get(),
    concurrency: config.concurrency.get(),
  }
}

/** Configuration after static validation, with every default materialized. */
export interface ResolvedArkToolkitConfig {
  provider: {
    baseUrl: string
    credential: CredentialRef
    userAgent: string
    tts: {
      baseUrl: string
      credential: CredentialRef
      resource: string
      voice: string
    }
  }
  timeoutMs: number
  concurrency: number
}

const MAX_TIMEOUT_MS = 600000
const MAX_CONCURRENCY = 16

/**
 * Validate and normalize a config object (partial inputs receive the same
 * defaults the schemastery schema applies). Configuration mistakes fail loud
 * at plugin load (the earliest resolvable point); runtime availability is a
 * separate, later concern.
 * @param config - parsed config with defaults applied.
 * @returns the fully defaulted, validated configuration.
 */
export function resolveConfig(config: ArkToolkitConfig = {}): ResolvedArkToolkitConfig {
  const provider = config.provider ?? {}
  const baseUrl = (provider.baseUrl ?? ARK_BASE_URL).trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(baseUrl) || baseUrl.length <= 'https://'.length) {
    throw new ArkToolkitError('config', 'provider.baseUrl must be an http(s) URL')
  }
  let credential: CredentialRef
  try {
    credential = credentialRef((provider.credential ?? ARK_CREDENTIAL).trim())
  } catch (error) {
    throw new ArkToolkitError(
      'config',
      `provider.credential "${provider.credential ?? ARK_CREDENTIAL}" is not a valid credential reference`,
      { cause: error },
    )
  }
  const userAgent = (provider.userAgent ?? DEFAULT_PROVIDER_USER_AGENT).trim()
  if (userAgent.length === 0) {
    throw new ArkToolkitError('config', 'provider.userAgent must not be empty')
  }
  const tts = provider.tts ?? {}
  const ttsBaseUrl = (tts.baseUrl ?? VOLCENGINE_TTS_URL).trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(ttsBaseUrl) || ttsBaseUrl.length <= 'https://'.length) {
    throw new ArkToolkitError('config', 'provider.tts.baseUrl must be an http(s) URL')
  }
  let ttsCredential: CredentialRef
  try {
    ttsCredential = credentialRef((tts.credential ?? VOLCENGINE_TTS_CREDENTIAL).trim())
  } catch (error) {
    throw new ArkToolkitError(
      'config',
      `provider.tts.credential "${tts.credential ?? VOLCENGINE_TTS_CREDENTIAL}" is not a valid credential reference`,
      { cause: error },
    )
  }
  const ttsResource = (tts.resource ?? VOLCENGINE_TTS_RESOURCE).trim()
  if (ttsResource.length === 0) {
    throw new ArkToolkitError('config', 'provider.tts.resource must not be empty')
  }
  const ttsVoice = (tts.voice ?? VOLCENGINE_TTS_VOICE).trim()
  if (ttsVoice.length === 0) {
    throw new ArkToolkitError('config', 'provider.tts.voice must not be empty')
  }
  const timeoutMs = config.timeoutMs ?? 600000
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > MAX_TIMEOUT_MS) {
    throw new ArkToolkitError('config', `timeoutMs must be an integer between 1000 and ${MAX_TIMEOUT_MS}`)
  }
  const concurrency = config.concurrency ?? 4
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > MAX_CONCURRENCY) {
    throw new ArkToolkitError('config', `concurrency must be an integer between 1 and ${MAX_CONCURRENCY}`)
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
  }
}
