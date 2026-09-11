import { describe, expect, it } from 'vitest'
import {
  ARK_BASE_URL,
  ARK_CREDENTIAL,
  ARK_SEEDREAM_MODEL,
  DEFAULT_PROVIDER_USER_AGENT,
  resolveConfig,
  resolveSeedreamModel,
  SEEDREAM_MODEL_ALIASES,
  VOLCENGINE_TTS_CREDENTIAL,
  VOLCENGINE_TTS_RESOURCE,
  VOLCENGINE_TTS_URL,
  VOLCENGINE_TTS_VOICE,
} from '../src/config.ts'

describe('resolveConfig', () => {
  it('applies the ByteDance Volcengine Ark defaults', () => {
    const config = resolveConfig({})
    expect(config.provider.baseUrl).toBe(ARK_BASE_URL)
    expect(config.provider.credential).toBe(ARK_CREDENTIAL)
    expect(ARK_SEEDREAM_MODEL).toBe('doubao-seedream-5-0-260128')
    expect(ARK_BASE_URL).toBe('https://ark.cn-beijing.volces.com/api/v3')
    expect(config.provider.userAgent).toBe(DEFAULT_PROVIDER_USER_AGENT)
    expect(config.timeoutMs).toBe(600000)
    expect(config.concurrency).toBe(4)
  })

  it('applies the ByteDance Volcengine Speech TTS defaults for the speak tool', () => {
    const config = resolveConfig({})
    expect(config.provider.tts.baseUrl).toBe(VOLCENGINE_TTS_URL)
    expect(config.provider.tts.credential).toBe(VOLCENGINE_TTS_CREDENTIAL)
    expect(config.provider.tts.resource).toBe(VOLCENGINE_TTS_RESOURCE)
    expect(config.provider.tts.voice).toBe(VOLCENGINE_TTS_VOICE)
    expect(VOLCENGINE_TTS_URL).toBe('https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse')
    expect(VOLCENGINE_TTS_CREDENTIAL).toBe('VOLCENGINE_TTS_KEY')
    expect(VOLCENGINE_TTS_RESOURCE).toBe('seed-tts-2.0')
    expect(VOLCENGINE_TTS_VOICE).toBe('zh_female_shuangkuaisisi_uranus_bigtts')
    expect(resolveConfig({ provider: { tts: { resource: 'seed-tts-2.0', voice: 'zh_female_xiaohe_uranus_bigtts' } } }).provider.tts)
      .toMatchObject({ resource: 'seed-tts-2.0', voice: 'zh_female_xiaohe_uranus_bigtts' })
  })

  it('rejects invalid Volcengine Speech TTS settings', () => {
    expect(() => resolveConfig({ provider: { tts: { baseUrl: 'ftp://x' } } })).toThrowError(/tts\.baseUrl/)
    expect(() => resolveConfig({ provider: { tts: { resource: '  ' } } })).toThrowError(/tts\.resource/)
    expect(() => resolveConfig({ provider: { tts: { voice: '  ' } } })).toThrowError(/tts\.voice/)
    expect(() => resolveConfig({ provider: { tts: { credential: 'not a ref!' } } })).toThrowError(/tts\.credential/)
  })

  it('keeps only ByteDance Seedream aliases in the alias table', () => {
    expect(SEEDREAM_MODEL_ALIASES).toEqual({
      'seedream-5.0-pro': 'doubao-seedream-5-0-pro-260628',
      'seedream-5.0-lite': 'doubao-seedream-5-0-260128',
      'seedream-4.5': 'doubao-seedream-4-5-251128',
      'seedream-4.0': 'doubao-seedream-4-0-250828',
    })
  })

  it('resolves Seedream aliases to full Ark model ids and passes through custom ids', () => {
    expect(resolveSeedreamModel('seedream-5.0-lite')).toBe('doubao-seedream-5-0-260128')
    expect(resolveSeedreamModel('seedream-4.5')).toBe('doubao-seedream-4-5-251128')
    expect(resolveSeedreamModel('doubao-seedream-4-0-250828')).toBe('doubao-seedream-4-0-250828')
    expect(resolveSeedreamModel('')).toBe(ARK_SEEDREAM_MODEL)
    expect(resolveSeedreamModel('  ')).toBe(ARK_SEEDREAM_MODEL)
    expect(resolveSeedreamModel('my-custom-model')).toBe('my-custom-model')
  })

  it('normalizes the provider URL and credential', () => {
    const config = resolveConfig({
      provider: {
        baseUrl: 'https://example.com/v1/',
        credential: 'MY_ARK_KEY',
        userAgent: 'custom-ark-client/2.0',
      },
    })
    expect(config.provider.baseUrl).toBe('https://example.com/v1')
    expect(config.provider.credential).toBe('MY_ARK_KEY')
    expect(config.provider.userAgent).toBe('custom-ark-client/2.0')
  })

  it('rejects a non-http baseUrl', () => {
    expect(() => resolveConfig({ provider: { baseUrl: 'ftp://x' } }))
      .toThrowError(/provider\.baseUrl/)
  })

  it('rejects an invalid credential reference', () => {
    expect(() => resolveConfig({ provider: { credential: 'not a ref!' } }))
      .toThrowError(/credential/)
  })

  it('rejects an empty User-Agent', () => {
    expect(() => resolveConfig({ provider: { userAgent: '  ' } }))
      .toThrowError(/provider\.userAgent/)
  })

  it('rejects unsupported limits', () => {
    expect(() => resolveConfig({ timeoutMs: 500 })).toThrowError(/timeoutMs/)
    expect(() => resolveConfig({ concurrency: 0 })).toThrowError(/concurrency/)
  })

  it('ignores the removed Python runtime options', () => {
    const config = resolveConfig({
      runtime: { mode: 'external', agentArkToolkitPath: '/tmp/toolkit', python: 'python3.12' } as never,
    })
    expect(config).not.toHaveProperty('runtime')
    expect(config.provider.baseUrl).toBe(ARK_BASE_URL)
  })

  it('ignores the removed image-understanding options', () => {
    const config = resolveConfig({
      provider: { model: 'doubao-seed-2-0-lite-260215', protocol: 'anthropic' } as never,
      language: 'en',
      maxImageBytes: 4194304,
      maxImagePixels: 20000000,
      imageInputVariants: { enabled: false } as never,
    } as never)
    expect(config).not.toHaveProperty('language')
    expect(config).not.toHaveProperty('maxImageBytes')
    expect(config).not.toHaveProperty('maxImagePixels')
    expect(config).not.toHaveProperty('imageInputVariants')
    expect(config.provider).not.toHaveProperty('model')
    expect(config.provider).not.toHaveProperty('protocol')
    expect(config.provider.baseUrl).toBe(ARK_BASE_URL)
  })
})
