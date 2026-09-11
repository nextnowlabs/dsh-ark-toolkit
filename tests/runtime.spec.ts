import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises'
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
  credential: string | null = 'test-ark-key',
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
      baseUrl: 'https://ark.example/v1',
      credential: 'ARK_API_KEY',
    },
    ...overrides,
  })
  const runtime = new ArkToolkitRuntime(ctx, config)
  return { ctx, config, runtime }
}

const signal = new AbortController().signal

/** One Seedream-shaped success response carrying the bundled sample PNG. */
async function seedreamResponse(): Promise<Response> {
  const png = await readFile(SAMPLE_IMAGE)
  return new Response(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

/** Stub the global fetch with one Seedream JSON response per call. */
function stubSeedreamFetch(calls: ReturnType<typeof vi.fn> = vi.fn()) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls(input, init)
    return seedreamResponse()
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, calls }
}

describe('ArkToolkitRuntime', () => {
  it('fails loud when the Ark credential is not configured', async () => {
    const { runtime } = await setup({}, null)
    const workspace = await tempWorkspace()
    await expect(runtime.generateImage({ prompt: 'a cat' }, { signal, workspace }))
      .rejects.toMatchObject({ code: 'config', message: /ARK_API_KEY is not configured/ })
  })

  it('generates a Seedream image through Volcengine Ark and delivers an artifact', async () => {
    const png = await readFile(SAMPLE_IMAGE)
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: [{ url: 'https://tos.example/seedream-1.png' }],
      }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(png, { status: 200, headers: { 'content-type': 'image/png' } })))
    const { runtime } = await setup()
    const workspace = await tempWorkspace()
    const result = await runtime.generateImage({ prompt: '一只小猫', output: 'cat.png' }, { signal, workspace })

    expect(result).toMatchObject({ prompt: '一只小猫', model: 'doubao-seedream-5-0-260128' })
    expect(result.images).toHaveLength(1)
    expect(result.images[0]).toMatchObject({
      width: 256,
      height: 256,
      format: 'png',
      artifact: { filename: 'cat.png', kind: 'image', sourceTool: 'ark_generate_image' },
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
      `data: ${JSON.stringify({ code: 0, message: 'success', format: 'mp3', data: mp3.toString('base64') })}`,
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
        sourceTool: 'ark_speak',
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

  it('reports health without network access and probes /models only when explicit', async () => {
    const server = createServer((request, response) => {
      expect(request.url).toBe('/v1/models')
      expect(request.headers.authorization).toBe('Bearer test-ark-key')
      expect(request.headers['user-agent']).toContain('Mozilla/5.0')
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end('{"data":[]}')
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    try {
      const address = server.address()
      if (address === null || typeof address === 'string') throw new Error('missing fixture server address')
      const { runtime } = await setup({
        provider: { baseUrl: `http://127.0.0.1:${address.port}/v1` },
      })
      const workspace = await tempWorkspace()
      const passive = await runtime.health(false, { signal, workspace })
      expect(passive).toMatchObject({
        connectionTested: false,
        checks: {
          credential: { status: 'ok' },
          ttsCredential: { status: 'ok' },
          artifactDirectory: { status: 'ok' },
          service: { status: 'not_tested' },
        },
      })
      const active = await runtime.health(true, { signal, workspace })
      expect(active).toMatchObject({
        connectionTested: true,
        healthy: true,
        checks: { service: { status: 'ok' } },
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
        provider: { baseUrl: `http://127.0.0.1:${address.port}/v1` },
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

  it('reports an error when the configured credential is unavailable', async () => {
    const { runtime } = await setup({}, null)
    const workspace = await tempWorkspace()
    const result = await runtime.health(true, { signal, workspace })
    expect(result).toMatchObject({
      healthy: false,
      checks: {
        credential: { status: 'error' },
        ttsCredential: { status: 'error' },
        service: { status: 'error' },
      },
    })
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
      return seedreamResponse()
    })
    vi.stubGlobal('fetch', fetchMock)
    const { runtime } = await setup({ concurrency: 1 })
    const workspace = await tempWorkspace()

    const sameStart = Date.now()
    await Promise.all([
      runtime.generateImage({ prompt: 'a' }, { signal, workspace, sessionId: 'same', timeoutMs: 5000 }),
      runtime.generateImage({ prompt: 'b' }, { signal, workspace, sessionId: 'same', timeoutMs: 5000 }),
    ])
    // Two calls in one session share the single slot: they serialize.
    expect(Date.now() - sameStart).toBeGreaterThanOrEqual(delay * 2 - 15)

    fetchMock.mockClear()
    const bothStart = Date.now()
    await Promise.all([
      runtime.generateImage({ prompt: 'c' }, { signal, workspace, sessionId: 'a', timeoutMs: 5000 }),
      runtime.generateImage({ prompt: 'd' }, { signal, workspace, sessionId: 'b', timeoutMs: 5000 }),
    ])
    // Independent sessions own separate gates: they overlap.
    expect(Date.now() - bothStart).toBeLessThan(delay * 2 - 15)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('starts a fresh execution timeout after a queued operation acquires its slot', async () => {
    const fetchMock = vi.fn(async () => {
      await new Promise<void>(resolve => setTimeout(resolve, 20))
      return seedreamResponse()
    })
    vi.stubGlobal('fetch', fetchMock)
    const { runtime } = await setup({ concurrency: 1 })
    const workspace = await tempWorkspace()

    const first = runtime.generateImage(
      { prompt: 'a' },
      { signal, workspace, sessionId: 'same', timeoutMs: 1000 },
    )
    const second = runtime.generateImage(
      { prompt: 'b' },
      { signal, workspace, sessionId: 'same', timeoutMs: 1000 },
    )
    await expect(Promise.all([first, second])).resolves.toHaveLength(2)
  })
})
