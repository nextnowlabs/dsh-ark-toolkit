import { copyFile, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Credentials } from '@deepseek-ai/dsh-credentials'
import { resolveConfig, type ArkToolkitConfig } from '../src/config.ts'
import { createDeadline, Semaphore, ArkToolkitRuntime } from '../src/runtime.ts'

const SAMPLE_IMAGE = fileURLToPath(new URL('./fixtures/sample.png', import.meta.url))

const tempDirs: string[] = []
const contexts: Context[] = []

async function tempWorkspace(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-ark-toolkit-runtime-'))
  tempDirs.push(dir)
  await copyFile(SAMPLE_IMAGE, join(dir, 'sample.png'))
  return dir
}

afterEach(async () => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

async function setup(
  overrides: ArkToolkitConfig = {},
  credential: string | null = 'test-vision-key',
) {
  const ctx = new Context()
  contexts.push(ctx)
  ctx.provide('credentials', {
    async resolve() {
      return credential === null ? undefined : { value: credential, source: 'env' }
    },
  } as unknown as Credentials)
  const config = resolveConfig({
    provider: {
      baseUrl: 'https://vision.example/v1',
      credential: 'VISION_API_KEY',
      model: 'fixture-model',
    },
    ...overrides,
  })
  const runtime = new ArkToolkitRuntime(ctx, config)
  return { ctx, config, runtime }
}

/** Stub the global fetch used by the vision client with one OpenAI-style chat completion. */
function stubVisionFetch(answer: string, calls: ReturnType<typeof vi.fn> = vi.fn()) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls(input, init)
    return new Response(JSON.stringify({
      choices: [{ message: { role: 'assistant', content: answer } }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, calls }
}

const signal = new AbortController().signal

describe('ArkToolkitRuntime', () => {
  it('fails loud when the Ark credential is not configured', async () => {
    const { runtime } = await setup({}, null)
    const workspace = await tempWorkspace()
    await expect(runtime.glance({ images: ['sample.png'] }, { signal, workspace }))
      .rejects.toMatchObject({ code: 'config', message: /VISION_API_KEY is not configured/ })
  })

  it('glance describes an image through the configured vision service', async () => {
    const { fetchMock } = stubVisionFetch('Fixture detailed description')
    const { runtime } = await setup()
    const workspace = await tempWorkspace()
    const result = await runtime.glance({ images: ['sample.png'] }, { signal, workspace })
    expect(result).toMatchObject({ mode: 'describe', answer: 'Fixture detailed description', truncated: false })
    expect(result.images[0]).toMatchObject({ width: 256, height: 256, format: 'png' })
    expect(result.images[0]?.bytes).toBeGreaterThan(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0] as [unknown, RequestInit]
    expect(String(init.headers?.Authorization)).toBe('Bearer test-vision-key')
    const body = JSON.parse(String(init.body)) as { model: string; messages: Array<{ content: Array<{ type: string }> }> }
    expect(body.model).toBe('fixture-model')
    expect(body.messages[0]?.content[0]).toMatchObject({ type: 'image_url' })
  })

  it('glance answers a question, OCRs, and zooms into a region', async () => {
    const { fetchMock } = stubVisionFetch('Fixture answer to the question')
    const { runtime } = await setup()
    const workspace = await tempWorkspace()
    const qa = await runtime.glance({ images: ['sample.png'], query: 'what color?' }, { signal, workspace })
    expect(qa).toMatchObject({ mode: 'qa', answer: 'Fixture answer to the question' })
    const ocr = await runtime.glance({ images: ['sample.png'], ocr: true }, { signal, workspace })
    expect(ocr).toMatchObject({ mode: 'ocr', answer: 'Fixture answer to the question' })
    await runtime.glance({ images: ['sample.png'], region: '10,10,30,30', query: 'x' }, { signal, workspace })
    // region crops before upload; assert the payload still resolves.
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('deduplicates the same resolved image inside one glance request', async () => {
    stubVisionFetch('Fixture detailed description')
    const { runtime } = await setup()
    const workspace = await tempWorkspace()
    const result = await runtime.glance({ images: ['sample.png', './sample.png'] }, { signal, workspace })
    expect(result.images).toHaveLength(1)
  })

  it('reuses the last identical glance result only inside the same live session', async () => {
    const { fetchMock } = stubVisionFetch('Fixture detailed description')
    const { runtime } = await setup()
    const workspace = await tempWorkspace()
    const firstSession = {}
    const options = { signal, workspace, sessionId: 'first', sessionScope: firstSession }

    const first = await runtime.glance({ images: ['sample.png'], query: 'what color?' }, options)
    const second = await runtime.glance({ images: ['sample.png'], query: 'what color?' }, options)
    expect(second).toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const otherSession = {}
    const third = await runtime.glance({ images: ['sample.png'], query: 'what color?' }, { ...options, sessionScope: otherSession })
    expect(third).not.toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not cache a failed glance request', async () => {
    const fetchMock = vi.fn(async () => new Response('boom', { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)
    const { runtime } = await setup()
    const workspace = await tempWorkspace()
    const session = {}
    const options = { signal, workspace, sessionScope: session }
    await expect(runtime.glance({ images: ['sample.png'] }, options)).rejects.toMatchObject({ code: 'service' })
    await expect(runtime.glance({ images: ['sample.png'] }, options)).rejects.toMatchObject({ code: 'service' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('glance rejects region with multiple images and mutually exclusive modes', async () => {
    const { runtime } = await setup()
    const workspace = await tempWorkspace()
    await expect(runtime.glance(
      { images: ['sample.png', 'sample.png'], region: '0,0,10,10' },
      { signal, workspace },
    )).rejects.toMatchObject({ code: 'input', message: /region works with exactly one image/ })
    await expect(runtime.glance(
      { images: ['sample.png'], query: 'x', ocr: true },
      { signal, workspace },
    )).rejects.toMatchObject({ code: 'input', message: /query and ocr are mutually exclusive/ })
  })

  it('rejects an empty vision API answer instead of exposing a partial model result', async () => {
    stubVisionFetch('   ')
    const { runtime } = await setup()
    const workspace = await tempWorkspace()
    await expect(runtime.glance({ images: ['sample.png'] }, { signal, workspace }))
      .rejects.toMatchObject({ code: 'output', message: /empty description/ })
  })

  it('generates a Seedream image through Volcengine Ark and delivers an artifact', async () => {
    const png = await readFile(SAMPLE_IMAGE)
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: [{ url: 'https://tos.example/seedream-1.png' }],
      }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(png, { status: 200, headers: { 'content-type': 'image/png' } })))
    const { runtime } = await setup({
      provider: {
        baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
        credential: 'ARK_API_KEY',
        model: 'doubao-seed-2-0-lite-260215',
      },
    })
    const workspace = await tempWorkspace()
    const result = await runtime.generateImage({ prompt: '一只小猫', output: 'cat.png' }, { signal, workspace })

    expect(result).toMatchObject({ prompt: '一只小猫', model: 'doubao-seedream-5-0-260128' })
    expect(result.images).toHaveLength(1)
    expect(result.images[0]).toMatchObject({
      width: 256,
      height: 256,
      format: 'png',
      artifact: { filename: 'cat.png', kind: 'image', sourceTool: 'vision_generate_image' },
    })
    const written = await readFile(result.images[0]?.artifact.path as string)
    expect(written.equals(png)).toBe(true)
  })

  it('resolves Seedream aliases and rejects invalid sizes for image generation', async () => {
    const { runtime } = await setup()
    const workspace = await tempWorkspace()
    await expect(runtime.generateImage({ prompt: 'x', model: 'seedream-4.5', size: '8K' }, { signal, workspace }))
      .rejects.toMatchObject({ code: 'input', message: /size must be 1K, 2K, 3K, or 4K/ })
    await expect(runtime.generateImage({ prompt: '   ' }, { signal, workspace }))
      .rejects.toMatchObject({ code: 'input', message: /prompt must not be empty/ })
  })

  it('reports an Ark failure when image generation returns a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(
      JSON.stringify({ error: { message: 'model not found', code: 'NotFound' } }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    )))
    const { runtime } = await setup()
    const workspace = await tempWorkspace()
    await expect(runtime.generateImage({ prompt: 'a tree' }, { signal, workspace }))
      .rejects.toMatchObject({ code: 'runtime', message: /model not found/ })
  })

  it('synthesizes speech through Volcengine TTS and delivers an mp3 artifact', async () => {
    const mp3 = Buffer.from('ID3\x03\x00\x00\x00\x00\x00\x00fake-mp3')
    const sse = [
      'event: message',
      `data: ${JSON.stringify({ code: 0, message: 'success', format: 'mp3', audio: mp3.toString('base64') })}`,
      '',
      'event: done',
      'data: [DONE]',
      '',
    ].join('\n')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(sse, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    })))
    const { runtime } = await setup()
    const workspace = await tempWorkspace()
    const result = await runtime.speak({ text: '你好', output: 'hi.mp3' }, { signal, workspace })

    expect(result).toMatchObject({
      text: '你好',
      voiceType: 'zh_female_shuangkuaisisi_uranus_bigtts',
      format: 'mp3',
      artifact: {
        filename: 'hi.mp3',
        kind: 'audio',
        mimeType: 'audio/mpeg',
        sourceTool: 'vision_speak',
        previewIntent: 'download',
      },
    })
    const written = await readFile(result.artifact.path)
    expect(written.equals(mp3)).toBe(true)
  })

  it('rejects invalid speak input before calling the TTS service', async () => {
    const { runtime } = await setup()
    const workspace = await tempWorkspace()
    await expect(runtime.speak({ text: '   ' }, { signal, workspace }))
      .rejects.toMatchObject({ code: 'input', message: /text must not be empty/ })
    await expect(runtime.speak({ text: 'hi', encoding: 'flac' }, { signal, workspace }))
      .rejects.toMatchObject({ code: 'input', message: /encoding must be mp3, ogg_opus, pcm, or wav/ })
    await expect(runtime.speak({ text: 'hi', speed: 99 }, { signal, workspace }))
      .rejects.toMatchObject({ code: 'input', message: /speed must be a number between 0\.1 and 3/ })
  })

  it('reports an upstream failure when TTS returns a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('forbidden', { status: 403 })))
    const { runtime } = await setup()
    const workspace = await tempWorkspace()
    await expect(runtime.speak({ text: 'hi' }, { signal, workspace }))
      .rejects.toMatchObject({ code: 'runtime', message: /HTTP 403/ })
  })

  it('fails loud when the Volcengine TTS credential is not configured', async () => {
    const { runtime } = await setup({}, null)
    const workspace = await tempWorkspace()
    await expect(runtime.speak({ text: 'hi' }, { signal, workspace }))
      .rejects.toMatchObject({ code: 'config', message: /VOLCENGINE_TTS_KEY is not configured/ })
  })

  it('auto-compresses oversized images and resizes pixel-over-limit images', async () => {
    stubVisionFetch('ok')
    const workspace = await tempWorkspace()
    const byteLimited = await setup({ maxImageBytes: 1024 })
    const byteResult = await byteLimited.runtime.glance({ images: ['sample.png'] }, { signal, workspace })
    const byteImage = byteResult.images[0]
    expect(byteImage?.bytes ?? 0).toBeLessThanOrEqual(1024)
    expect(byteImage?.path).toMatch(/compressed-images/u)
    expect(byteImage?.originalPath).toBe(await realpath(join(workspace, 'sample.png')))
    await expect(readFile(join(workspace, 'sample.png'))).resolves.toEqual(await readFile(SAMPLE_IMAGE))

    const pixelLimited = await setup({ maxImagePixels: 65_535 })
    const pixelResult = await pixelLimited.runtime.glance({ images: ['sample.png'] }, { signal, workspace })
    const pixelImage = pixelResult.images[0]
    expect((pixelImage?.width ?? 0) * (pixelImage?.height ?? 0)).toBeLessThanOrEqual(65_535)
    expect(pixelImage?.path).toMatch(/compressed-images/u)
    expect(pixelImage?.originalPath).toBe(await realpath(join(workspace, 'sample.png')))
  })

  it('reuses the durable compressed-image cache for identical inputs', async () => {
    stubVisionFetch('ok')
    const { runtime } = await setup({ maxImageBytes: 1024 })
    const workspace = await tempWorkspace()
    const options = { signal, workspace }

    const first = await runtime.glance({ images: ['sample.png'] }, options)
    const second = await runtime.glance({ images: ['sample.png'] }, options)
    expect(second).toEqual(first)
    const entries = await readdir(join(workspace, '.dsh-ark-toolkit', 'tmp', 'compressed-images'))
    const cacheEntries = entries.filter(entry => !entry.startsWith('.'))
    expect(cacheEntries).toHaveLength(1)
    expect(cacheEntries[0]).toMatch(/^v2-[0-9a-f]{16}-b\d+-p\d+-[0-9a-f]{16}-\d+x\d+\.(?:jpg|png|webp)$/u)
  })

  it('ignores and replaces tampered compressed-cache entries', async () => {
    stubVisionFetch('ok')
    const { runtime } = await setup({ maxImageBytes: 1024 })
    const workspace = await tempWorkspace()
    const options = { signal, workspace }
    await runtime.glance({ images: ['sample.png'] }, options)
    const cacheDir = join(workspace, '.dsh-ark-toolkit', 'tmp', 'compressed-images')
    const entries = (await readdir(cacheDir)).filter(name => !name.startsWith('.'))
    expect(entries).toHaveLength(1)
    const first = entries[0]!
    await writeFile(join(cacheDir, first), 'tampered')
    const after = await runtime.glance({ images: ['sample.png'] }, options)
    expect(after.images[0]?.bytes ?? 0).toBeLessThanOrEqual(1024)
    const repaired = (await readdir(cacheDir)).filter(name => !name.startsWith('.'))
    expect(repaired).toHaveLength(1)
  })

  it('rejects missing images and extension/content mismatches', async () => {
    stubVisionFetch('ok')
    const { runtime } = await setup()
    const workspace = await tempWorkspace()
    await expect(runtime.glance({ images: ['missing.png'] }, { signal, workspace }))
      .rejects.toMatchObject({ code: 'input' })
    await writeFile(join(workspace, 'wrong.png'), await readFile(SAMPLE_IMAGE))
    await expect(runtime.glance({ images: ['wrong.png'] }, { signal, workspace }))
      .rejects.toMatchObject({ code: 'input', message: /filename uses \.png/ })
  })

  it('reports health without network access and tests /models only when explicit', async () => {
    const server = createServer((request, response) => {
      expect(request.url).toBe('/v1/models')
      expect(request.headers.authorization).toBe('Bearer test-vision-key')
      expect(request.headers['user-agent']).toContain('Mozilla/5.0')
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end('{"data":[]}')
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    try {
      const address = server.address()
      if (address === null || typeof address === 'string') throw new Error('missing fixture server address')
      const { runtime } = await setup({
        provider: {
          baseUrl: `http://127.0.0.1:${address.port}/v1`,
          credential: 'VISION_API_KEY',
          model: 'fixture-model',
        },
      })
      const workspace = await tempWorkspace()
      const passive = await runtime.health(false, { signal, workspace })
      expect(passive).toMatchObject({
        connectionTested: false,
        modelTested: false,
        checks: {
          credential: { status: 'ok' },
          service: { status: 'not_tested' },
          model: { status: 'not_tested' },
        },
      })
      const active = await runtime.health(true, { signal, workspace })
      expect(active).toMatchObject({
        connectionTested: true,
        modelTested: false,
        checks: { service: { status: 'ok' }, model: { status: 'not_tested' } },
      })
      const model = await runtime.health(true, { signal, workspace }, true)
      expect(model).toMatchObject({
        connectionTested: true,
        modelTested: true,
        checks: { service: { status: 'ok' }, model: { status: 'ok' } },
      })
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error === undefined ? resolve() : reject(error)))
    }
  })

  it('treats a 403 from GET /models as a warning instead of claiming the key was rejected', async () => {
    const server = createServer((_request, response) => {
      response.writeHead(403, { 'content-type': 'application/json' })
      response.end('{"error":{"message":"Forbidden","type":"permission_error","code":"restricted"}}')
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    try {
      const address = server.address()
      if (address === null || typeof address === 'string') throw new Error('missing fixture server address')
      const { runtime } = await setup({
        provider: {
          baseUrl: `http://127.0.0.1:${address.port}/v1`,
          credential: 'VISION_API_KEY',
          model: 'fixture-model',
        },
      })
      const workspace = await tempWorkspace()
      const result = await runtime.health(true, { signal, workspace })
      expect(result).toMatchObject({
        healthy: true,
        connectionTested: true,
        checks: {
          service: {
            status: 'warning',
            detail: expect.stringContaining('restricted GET /models (HTTP 403)'),
          },
        },
      })
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error === undefined ? resolve() : reject(error)))
    }
  })

  it('reports a real multimodal model-test failure without treating /models as success', async () => {
    const server = createServer((request, response) => {
      if (request.url === '/v1/models') {
        response.writeHead(200, { 'content-type': 'application/json' })
        response.end('{"data":[]}')
        return
      }
      response.writeHead(500, { 'content-type': 'application/json' })
      response.end('{"error":{"message":"upstream exploded"}}')
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    try {
      const address = server.address()
      if (address === null || typeof address === 'string') throw new Error('missing fixture server address')
      const { runtime } = await setup({
        provider: {
          baseUrl: `http://127.0.0.1:${address.port}/v1`,
          credential: 'VISION_API_KEY',
          model: 'fixture-model',
        },
      })
      const workspace = await tempWorkspace()
      const result = await runtime.health(true, { signal, workspace }, true)
      expect(result).toMatchObject({
        healthy: true,
        connectionTested: true,
        modelTested: true,
        checks: { service: { status: 'ok' }, model: { status: 'error' } },
      })
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error === undefined ? resolve() : reject(error)))
    }
  })

  it('uses Anthropic authentication for an explicit connection test', async () => {
    const server = createServer((request, response) => {
      expect(request.headers['x-api-key']).toBe('test-vision-key')
      expect(request.headers['anthropic-version']).toBe('2023-06-01')
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end('{"data":[]}')
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    try {
      const address = server.address()
      if (address === null || typeof address === 'string') throw new Error('missing fixture server address')
      const { runtime } = await setup({
        provider: {
          baseUrl: `http://127.0.0.1:${address.port}/v1`,
          protocol: 'anthropic',
        },
      })
      const workspace = await tempWorkspace()
      const result = await runtime.health(true, { signal, workspace })
      expect(result.checks.service.status).toBe('ok')
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error === undefined ? resolve() : reject(error)))
    }
  })
})

describe('createDeadline', () => {
  it('reports only timeout when the timer fires first', async () => {
    const deadline = createDeadline(new AbortController().signal, 5)
    await new Promise<void>(resolve => setTimeout(resolve, 20))
    expect(deadline.timedOut).toBe(true)
    expect(deadline.cancelled).toBe(false)
    expect(deadline.signal.aborted).toBe(true)
    deadline.cleanup()
  })

  it('reports only cancellation when the caller signal fires first', async () => {
    const controller = new AbortController()
    const deadline = createDeadline(controller.signal, 1000)
    controller.abort()
    expect(deadline.timedOut).toBe(false)
    expect(deadline.cancelled).toBe(true)
    expect(deadline.signal.aborted).toBe(true)
    deadline.cleanup()
  })
})

describe('Semaphore', () => {
  it('bounds concurrent acquisitions and transfers a slot without losing capacity', async () => {
    const semaphore = new Semaphore(2)
    await semaphore.acquire(new AbortController().signal)
    await semaphore.acquire(new AbortController().signal)
    const signal = new AbortController().signal
    let released = false
    const pending = semaphore.acquire(signal).then(() => { released = true })
    await new Promise<void>(resolve => setTimeout(resolve, 10))
    expect(released).toBe(false)
    semaphore.release()
    await pending
    expect(released).toBe(true)
  })

  it('rejects a queued waiter when its signal aborts', async () => {
    const semaphore = new Semaphore(1)
    await semaphore.acquire(new AbortController().signal)
    const controller = new AbortController()
    const pending = semaphore.acquire(controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ code: 'cancelled' })
  })
})

describe('session-scoped concurrency', () => {
  it('serializes one session while allowing independent sessions to overlap', async () => {
    const delay = 50
    const fetchMock = vi.fn(async () => {
      await new Promise<void>(resolve => setTimeout(resolve, delay))
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const { runtime } = await setup({ concurrency: 1 })
    const workspace = await tempWorkspace()

    const sameStart = Date.now()
    await Promise.all([
      runtime.glance({ images: ['sample.png'] }, { signal, workspace, sessionId: 'same', timeoutMs: 5000 }),
      runtime.glance({ images: ['sample.png'] }, { signal, workspace, sessionId: 'same', timeoutMs: 5000 }),
    ])
    // Two calls in one session share the single slot: they serialize.
    expect(Date.now() - sameStart).toBeGreaterThanOrEqual(delay * 2 - 15)

    fetchMock.mockClear()
    const bothStart = Date.now()
    await Promise.all([
      runtime.glance({ images: ['sample.png'] }, { signal, workspace, sessionId: 'a', timeoutMs: 5000 }),
      runtime.glance({ images: ['sample.png'] }, { signal, workspace, sessionId: 'b', timeoutMs: 5000 }),
    ])
    // Independent sessions own separate gates: they overlap.
    expect(Date.now() - bothStart).toBeLessThan(delay * 2 - 15)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('starts a fresh execution timeout after a queued operation acquires its slot', async () => {
    const fetchMock = vi.fn(async () => {
      await new Promise<void>(resolve => setTimeout(resolve, 20))
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const { runtime } = await setup({ concurrency: 1 })
    const workspace = await tempWorkspace()

    const first = runtime.glance(
      { images: ['sample.png'] },
      { signal, workspace, sessionId: 'same', timeoutMs: 500 },
    )
    const second = runtime.glance(
      { images: ['sample.png'] },
      { signal, workspace, sessionId: 'same', timeoutMs: 500 },
    )
    await expect(Promise.all([first, second])).resolves.toHaveLength(2)
  })
})
