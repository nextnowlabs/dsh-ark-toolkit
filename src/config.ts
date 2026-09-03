/**
 * Plugin configuration: provider endpoint and credential reference, output
 * language, and local safety limits. Secrets never live here —
 * `provider.credential` is a DSH Credential reference resolved per operation
 * through `ctx.credentials`. There is no Python or vendored runtime to locate.
 * @module dsh-ark-toolkit/config
 */

import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'
import { credentialRef, type CredentialRef } from '@deepseek-ai/dsh-credentials'
import { ArkToolkitError } from './errors.ts'
import {
  ARK_BASE_URL,
  ARK_CREDENTIAL,
  ARK_SEEDREAM_MODEL,
  ARK_VISION_MODEL,
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
  ARK_VISION_MODEL,
  SEEDREAM_MODEL_ALIASES,
  VOLCENGINE_TTS_CREDENTIAL,
  VOLCENGINE_TTS_RESOURCE,
  VOLCENGINE_TTS_URL,
  VOLCENGINE_TTS_VOICE,
} from './defaults.ts'

/** Settings document namespace owned by this plugin (0.1.2-rc.1: a plain string, no branded constructor). */
export const ARK_TOOLKIT_SETTINGS_NAMESPACE = 'ark-toolkit' as const

/** Browser-compatible default shared with the vendored Python client. */
export const DEFAULT_VISION_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

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
    /** Provider API base URL. */
    baseUrl?: string
    /** DSH Credential reference holding the API key (an environment-style name). */
    credential?: string
    /** Multimodal model name. */
    model?: string
    /** Vision request protocol: OpenAI Chat Completions or Anthropic Messages. */
    protocol?: 'openai' | 'anthropic'
    /** Outbound User-Agent for provider requests and connection tests. */
    userAgent?: string
    /**
     * Volcengine Speech TTS (ByteDance) settings for the `ark_speak` tool.
     * This uses the standalone `openspeech.bytedance.com` TTS V3 service with
     * its own API key credential and resource id, independent of the Ark vision key.
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
  /** Vision output language (`zh` or `en`). */
  language?: 'zh' | 'en'
  /** Single remote/upstream call budget in milliseconds. */
  timeoutMs?: number
  /** Maximum input image size in bytes; larger images are auto-compressed (lossless first). */
  maxImageBytes?: number
  /** Maximum decoded pixel count per input image; larger images are auto-downscaled to fit. */
  maxImagePixels?: number
  /** In-flight tool execution cap per session. */
  concurrency?: number
  /** Extra directories (besides the workspace) inputs may come from. */
  allowedDirs?: string[]
  /**
   * Image-input variants: sibling model-selector entries for every model the
   * host positively declares text-only. A variant declares image input, so
   * pasted images keep the native attachment flow (composer thumbnail and
   * durable session image), and the plugin rewrites image blocks into Vision
   * Toolkit descriptions only on the wire to the model.
   */
  imageInputVariants?: {
    /** Whether variant routes are registered at all (default true). */
    enabled?: boolean
    /** Restrict wrapped upstream routes by provider id; empty wraps every eligible route. */
    providers?: string[]
    /**
     * Whether the browser paste integration automatically switches the Session
     * to the image-input variant of a text-only model before the paste, so
     * pasted images keep the native attachment flow with no manual model
     * change. The variant still exposes a workspace path to the model; off
     * keeps the path-only takeover instead (default true).
     */
    autoSwitch?: boolean
    /**
     * Transparent routing: variant routes keep the upstream provider and model
     * display names, and the browser integration hides the upstream text-only
     * entries that have a variant twin, so the model selector shows one entry
     * per model and sessions stay on the image-capable variant without users
     * seeing or switching a `(Ark Toolkit)` route. On by default; disable
     * to restore the explicit sibling entries.
     */
    hidden?: boolean
  }
}

/** Configuration schema with the documented P0 defaults. */
export const Config: Schema<ArkToolkitConfig> = z.object({
  provider: z.object({
    baseUrl: z.string().default(ARK_BASE_URL),
    credential: z.string().default(ARK_CREDENTIAL),
    model: z.string().default(ARK_VISION_MODEL),
    protocol: z.union(['openai', 'anthropic'] as const).default('openai'),
    userAgent: z.string().default(DEFAULT_VISION_USER_AGENT),
    tts: z.object({
      baseUrl: z.string().default(VOLCENGINE_TTS_URL),
      credential: z.string().default(VOLCENGINE_TTS_CREDENTIAL),
      resource: z.string().default(VOLCENGINE_TTS_RESOURCE),
      voice: z.string().default(VOLCENGINE_TTS_VOICE),
    }),
  }),
  language: z.union(['zh', 'en'] as const).default('zh'),
  timeoutMs: z.number().default(600000),
  maxImageBytes: z.number().default(4194304),
  maxImagePixels: z.number().default(20000000),
  concurrency: z.number().default(4),
  allowedDirs: z.array(z.string()).default([]),
  imageInputVariants: z.object({
    enabled: z.boolean().default(true),
    providers: z.array(z.string()).default([]),
    autoSwitch: z.boolean().default(true),
    hidden: z.boolean().default(true),
  }),
})

/** Configuration after static validation, with every default materialized. */
export interface ResolvedArkToolkitConfig {
  provider: {
    baseUrl: string
    credential: CredentialRef
    model: string
    protocol: 'openai' | 'anthropic'
    userAgent: string
    tts: {
      baseUrl: string
      credential: CredentialRef
      resource: string
      voice: string
    }
  }
  language: 'zh' | 'en'
  timeoutMs: number
  maxImageBytes: number
  maxImagePixels: number
  concurrency: number
  allowedDirs: string[]
  imageInputVariants: {
    enabled: boolean
    providers: string[]
    autoSwitch: boolean
    hidden: boolean
  }
}

const MAX_TIMEOUT_MS = 600000
const MAX_IMAGE_BYTES = 268435456
const MAX_IMAGE_PIXELS = 268435456
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
  const model = (provider.model ?? ARK_VISION_MODEL).trim()
  if (model.length === 0) {
    throw new ArkToolkitError('config', 'provider.model must not be empty')
  }
  const protocol = provider.protocol ?? 'openai'
  if (protocol !== 'openai' && protocol !== 'anthropic') {
    throw new ArkToolkitError('config', 'provider.protocol must be "openai" or "anthropic"')
  }
  const userAgent = (provider.userAgent ?? DEFAULT_VISION_USER_AGENT).trim()
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
  const language = config.language ?? 'zh'
  if (language !== 'zh' && language !== 'en') {
    throw new ArkToolkitError('config', 'language must be "zh" or "en"')
  }
  const timeoutMs = config.timeoutMs ?? 600000
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > MAX_TIMEOUT_MS) {
    throw new ArkToolkitError('config', `timeoutMs must be an integer between 1000 and ${MAX_TIMEOUT_MS}`)
  }
  const maxImageBytes = config.maxImageBytes ?? 4194304
  if (!Number.isInteger(maxImageBytes) || maxImageBytes < 1024 || maxImageBytes > MAX_IMAGE_BYTES) {
    throw new ArkToolkitError('config', `maxImageBytes must be an integer between 1024 and ${MAX_IMAGE_BYTES}`)
  }
  const maxImagePixels = config.maxImagePixels ?? 20000000
  if (!Number.isInteger(maxImagePixels) || maxImagePixels < 1 || maxImagePixels > MAX_IMAGE_PIXELS) {
    throw new ArkToolkitError('config', `maxImagePixels must be an integer between 1 and ${MAX_IMAGE_PIXELS}`)
  }
  const concurrency = config.concurrency ?? 4
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > MAX_CONCURRENCY) {
    throw new ArkToolkitError('config', `concurrency must be an integer between 1 and ${MAX_CONCURRENCY}`)
  }
  const allowedDirs = (config.allowedDirs ?? []).map(dir => dir.trim()).filter(dir => dir.length > 0)
  const imageInputVariants = config.imageInputVariants ?? {}
  const variantProviders = (imageInputVariants.providers ?? [])
    .map(provider => provider.trim())
    .filter(provider => provider.length > 0)
  return {
    provider: {
      baseUrl,
      credential,
      model,
      protocol,
      userAgent,
      tts: { baseUrl: ttsBaseUrl, credential: ttsCredential, resource: ttsResource, voice: ttsVoice },
    },
    language,
    timeoutMs,
    maxImageBytes,
    maxImagePixels,
    concurrency,
    allowedDirs,
    imageInputVariants: {
      enabled: imageInputVariants.enabled ?? true,
      providers: variantProviders,
      autoSwitch: imageInputVariants.autoSwitch ?? true,
      hidden: imageInputVariants.hidden ?? true,
    },
  }
}
