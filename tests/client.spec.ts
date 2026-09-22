// @vitest-environment jsdom

import { createElement, type ComponentType } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-chat/client'
import { apply, decodeArkResult, inject } from '../src/client/index.tsx'

afterEach(() => {
  cleanup()
  document.querySelectorAll('style[data-plugin-css="@nextnowlabs/dsh-ark-toolkit/client"]').forEach(element => { element.remove() })
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function settled(meta: unknown, isError = false, toolName = 'ark_generate_image'): ToolCallBlock {
  return {
    kind: 'tool-result',
    seq: 2,
    time: Date.now(),
    callId: 'call-1',
    call: { name: toolName, argsRaw: '{}' },
    callTime: Date.now() - 10,
    content: [{ type: 'text', text: JSON.stringify(meta) }],
    isError,
    meta,
    callView: null,
    resultView: null,
    subCalls: [],
  } as unknown as ToolCallBlock
}

interface Registered {
  options: Record<string, unknown>
  component: ComponentType<Record<string, unknown>>
  face: () => Record<string, unknown>
}

/** One entry's configuration as the Host mirror serves it to this client. */
interface FakeFormState {
  value: Record<string, unknown>
  user: Record<string, unknown> | undefined
  base: Record<string, unknown> | undefined
  revision: number
  writable: boolean
  status: 'ready' | 'unavailable'
}

/** Copy of the entry section a fresh profile serves, with one user override. */
function servedValue(): Record<string, unknown> {
  return {
    provider: {
      baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      credential: 'ARK_API_KEY',
      userAgent: 'fixture-agent/1.0',
      tts: {
        baseUrl: 'https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse',
        credential: 'VOLCENGINE_TTS_KEY',
        resource: 'seed-tts-2.0',
        voice: 'zh_female_shuangkuaisisi_uranus_bigtts',
      },
    },
    timeoutMs: 61000,
    concurrency: 4,
  }
}

function applySet(section: Record<string, unknown>, path: readonly string[], value: unknown): void {
  let node = section
  for (const key of path.slice(0, -1)) {
    const next = node[key]
    if (typeof next !== 'object' || next === null) node[key] = {}
    node = node[key] as Record<string, unknown>
  }
  node[path[path.length - 1] ?? ''] = value
}

function applyUnset(section: Record<string, unknown>, path: readonly string[]): void {
  let node: Record<string, unknown> = section
  for (const key of path.slice(0, -1)) {
    const next = node[key]
    if (typeof next !== 'object' || next === null) return
    node = next as Record<string, unknown>
  }
  Reflect.deleteProperty(node, path[path.length - 1] ?? '')
}

/**
 * The shared configuration form for one entry, as `ctx.configForms.get` serves
 * it: a snapshot the page reads and a path-addressed mutation it writes.
 */
function fakeConfigForms(overrides: Partial<FakeFormState> = {}) {
  const state: FakeFormState = {
    value: servedValue(),
    user: undefined,
    base: undefined,
    revision: 1,
    writable: true,
    status: 'ready',
    ...overrides,
  }
  const listeners = new Set<() => void>()
  const publish = (): void => { for (const listener of listeners) listener() }
  const mutate = vi.fn(async (ops: ReadonlyArray<{ op: string; path: readonly string[]; value?: unknown }>) => {
    for (const op of ops) {
      if (op.op === 'set') applySet(state.value, op.path, op.value)
      else applyUnset(state.value, op.path)
    }
    state.user = state.user ?? {}
    state.revision += 1
    publish()
    return true
  })
  return {
    state,
    mutate,
    publish,
    scope: {
      getSnapshot: () => ({
        status: state.status,
        value: state.value,
        base: state.base,
        user: state.user,
        revision: state.revision,
        writable: state.writable,
        mode: 'host' as const,
      }),
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      },
      mutate,
    },
  }
}

/** The credentials domain as `ctx.remote.credentials` exposes it. */
function fakeCredentials(views: Record<string, { configured: boolean; source?: string; writable: boolean }> = {}) {
  const describe = vi.fn(async (refs: string[]) => ({
    ok: true as const,
    value: Object.fromEntries(refs.map(ref => [ref, views[ref] ?? { configured: false, writable: true }])),
  }))
  const set = vi.fn(async () => ({ ok: true as const, value: undefined }))
  return { describe, set }
}

function fakeClientContext(
  forms: ReturnType<typeof fakeConfigForms> = fakeConfigForms(),
  credentials: ReturnType<typeof fakeCredentials> = fakeCredentials(),
  options: { served?: boolean } = {},
) {
  const registrations: Registered[] = []
  const effects: Array<() => void> = []
  const slots = {
    inject: vi.fn((_name: string, callback: () => unknown) => {
      const result = callback()
      if (result !== null && typeof result === 'object' && Symbol.iterator in result) {
        for (const dispose of result as Iterable<() => void>) effects.push(dispose)
      } else if (typeof result === 'function') {
        effects.push(result as () => void)
      }
    }),
    register: vi.fn((entry: Record<string, unknown>, component: ComponentType<Record<string, unknown>>) => {
      registrations.push({
        options: entry,
        component,
        face: () => (typeof entry.inject === 'function' ? (entry.inject as () => Record<string, unknown>)() : {}),
      })
      return () => {}
    }),
  }
  const ctx = {
    slots,
    locale: {
      register: vi.fn(() => () => {}),
      bind: vi.fn(() => (key: string) => key),
    },
    remote: { $on: vi.fn(() => () => {}), credentials },
    configForms: {
      get: vi.fn(() => forms.scope),
      whileServed: vi.fn((namespaces: readonly string[], register: () => () => void) => (
        options.served === false ? () => {} : register()
      )),
    },
    effect: vi.fn((setup: () => void | (() => void)) => {
      const dispose = setup()
      if (typeof dispose === 'function') effects.push(dispose)
    }),
    on: vi.fn(() => () => {}),
    inject: vi.fn((services: string[], callback: (scope: unknown) => void) => {
      if (services.every(service => service in ctx)) callback(ctx)
    }),
  }
  return { ctx, slots, registrations, effects, forms, credentials }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** The Host action snapshot: the runtime and the update capability, nothing else. */
function actionSnapshot(runtime: { ready: boolean; generation: number; lastError?: string } = { ready: true, generation: 1 }) {
  return {
    schemaVersion: 1,
    runtime,
    release: {
      pluginVersion: '0.1.0',
      update: { supported: true, profile: 'web', dependencySpec: '0.1.0' },
    },
    artifactRouteAvailable: true,
  }
}

function artifact(
  path: string,
  filename: string,
  mimeType: string,
  kind: 'image' | 'svg' | 'json' | 'audio',
  description: string,
  previewIntent: 'image' | 'svg' | 'text' | 'download',
) {
  return {
    path,
    filename,
    mimeType,
    kind,
    description,
    sourceTool: 'ark_card_test',
    previewIntent,
    bytes: 123,
  }
}

/** Resolve one registered keyed component by its slot key. */
function componentOf(registrations: Registered[], key: string) {
  const found = registrations.find(entry => entry.options.key === key)
  if (found === undefined) throw new Error(`${key} component was not registered`)
  return found.component
}

/** The plugin's own configuration page, registered as a `plugins.item` entry. */
function pageOf(registrations: Registered[]): Registered {
  const found = registrations.find(entry => entry.options.name === 'plugins.item')
  if (found === undefined) throw new Error('the configuration page was not registered')
  return found
}

/** Render the page with the props the Plugins panel gives it. */
function renderPage(registrations: Registered[], view: 'page' | 'summary' = 'page') {
  const page = pageOf(registrations)
  return render(createElement(page.component, { view, t: (key: string) => key, ...page.face() }))
}

describe('Ark Toolkit client plugin', () => {
  it('prefers canonical presentation metadata and falls back to JSON result text', () => {
    const canonical = { prompt: 'a cat', images: [] }
    expect(decodeArkResult(settled(canonical))).toBe(canonical)
    const noMeta = { ...settled(undefined), content: [{ type: 'text', text: '{}' }] } as unknown as ToolCallBlock
    expect(decodeArkResult(noMeta)).toEqual({})
    expect(decodeArkResult(settled(canonical, true))).toBeUndefined()
  })

  it('renders generated Seedream images with safe previews and actions', () => {
    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    const image = artifact(
      '/workspace/.dsh-ark-toolkit/artifacts/cat.png',
      'cat.png',
      'image/png',
      'image',
      'Seedream generated image',
      'image',
    )
    const block = settled({
      prompt: '一只小猫',
      model: 'doubao-seedream-5-0-260128',
      images: [
        { width: 256, height: 256, format: 'png', artifact: image },
      ],
      $dshArkToolkit: {
        schemaVersion: 1,
        artifacts: [{ path: image.path, previewUrl: '/preview-token', downloadUrl: '/download-token' }],
      },
    }, false, 'ark_generate_image')
    const openFile = vi.fn()
    render(createElement(componentOf(registrations, 'ark_generate_image'), {
      callId: 'call-1', toolName: 'ark_generate_image', block, openFile,
      t: (key: string) => key,
    }))

    expect(screen.getByRole('img', { name: 'Seedream generated image' }).getAttribute('src')).toBe('/preview-token')
    expect(screen.getByRole('link', { name: 'download' }).getAttribute('href')).toBe('/download-token')
    expect(screen.getByText('cat.png')).toBeTruthy()
  })

  it('renders synthesized speech with a download action and no image preview', () => {
    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    const audio = artifact(
      '/workspace/.dsh-ark-toolkit/artifacts/hi.mp3',
      'hi.mp3',
      'audio/mpeg',
      'audio',
      'ByteDance TTS speech',
      'download',
    )
    const block = settled({
      text: '你好',
      voiceType: 'zh_female_shuangkuaisisi_uranus_bigtts',
      format: 'mp3',
      artifact: audio,
      $dshArkToolkit: {
        schemaVersion: 1,
        artifacts: [{ path: audio.path, previewUrl: '/audio-preview', downloadUrl: '/audio-download' }],
      },
    }, false, 'ark_speak')
    const openFile = vi.fn()
    render(createElement(componentOf(registrations, 'ark_speak'), {
      callId: 'call-speak', toolName: 'ark_speak', block, openFile,
      t: (key: string) => key,
    }))

    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText('hi.mp3')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'download' }).getAttribute('href')).toBe('/audio-download')
  })

  it('registers both dedicated Tool views and this plugin\'s own Plugins-panel page', () => {
    expect(inject).toEqual(['slots', 'locale', 'remote', 'remote.credentials', 'configForms'])
    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    const remote = ctx.remote as unknown as { $on: ReturnType<typeof vi.fn> }
    // The credential badge follows the Host's own invalidation signal; a
    // committed settings change reaches the page through the shared form
    // mirror, so no settings listener is registered here at all.
    expect(remote.$on).toHaveBeenCalledWith('credentials/reference-updated', expect.any(Function))
    expect(remote.$on).not.toHaveBeenCalledWith('settings/document-updated', expect.any(Function))

    const toolKeys = registrations
      .filter(entry => entry.options.name === 'tool.call.toolview')
      .map(entry => entry.options.key)
    expect(toolKeys).toEqual([
      'ark_generate_image',
      'ark_speak',
    ])
    // DSH 0.1.7 addresses a plugin's page and its configuration by profile entry
    // id, so the page is a `plugins.item` list entry keyed by that id.
    expect(pageOf(registrations).options).toMatchObject({
      id: 'ark-toolkit',
      locale: 'ark-toolkit',
      order: expect.any(Number),
    })
    expect(registrations.some(entry => entry.options.name === 'plugins.bundle.config')).toBe(false)
  })

  it('shows the page only while the Host serves this plugin\'s entry', () => {
    const { ctx, registrations } = fakeClientContext(fakeConfigForms(), fakeCredentials(), { served: false })
    apply(ctx as never)
    expect(registrations.some(entry => entry.options.name === 'plugins.item')).toBe(false)
  })

  it('uses Harness theme tokens for every theme-dependent color', () => {
    const { ctx } = fakeClientContext()
    apply(ctx as never)

    const styles = document.querySelector<HTMLStyleElement>('style[data-plugin-css="@nextnowlabs/dsh-ark-toolkit/client"]')
    const css = styles?.textContent ?? ''
    expect(css).toContain('.dvt-preview{display:block;width:100%;max-height:360px;object-fit:contain;background:repeating-conic-gradient(var(--dsw-alias-bg-module-platform) 0 25%,var(--dsw-alias-bg-layer-1) 0 50%)')
    expect(css).toContain('.dvt-download{display:inline-flex;align-items:center;height:28px;padding:0 12px;border-radius:999px;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)')
    expect(css).toContain('.dvt-download:hover{background:var(--dsw-alias-button-primary-hover)}')
    expect(css).toContain('.dvt-health-grid>div[data-status=error]{border-left-color:var(--dsw-alias-state-error-primary)}')
    expect(css).toContain('.dvt-panel{')
    expect(css).toContain('.dvt-panel-title{display:flex;align-items:flex-start;justify-content:space-between')
    expect(css).toContain('.dvt-advanced-body{display:grid;grid-template-columns:minmax(0,1fr)')
    expect(css).not.toContain('dvt-paste-')
    expect(css).not.toMatch(/--dsw-alias-(?:fg-primary|fg-muted|border-subtle)/u)
    expect(css).not.toMatch(/var\(--dsw-[^,)]+,/u)
    expect(css).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(/iu)
  })

  it('answers the summary view with the page one-liner', () => {
    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    const view = renderPage(registrations, 'summary')
    expect(view.container.textContent).toBe('settingsIntro')
  })

  it('stages edits and writes them as one path-addressed mutation on save', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true, value: actionSnapshot() })))
    const { ctx, registrations, forms } = fakeClientContext()
    apply(ctx as never)
    renderPage(registrations)

    const concurrency = screen.getByLabelText('concurrency') as HTMLInputElement
    fireEvent.change(concurrency, { target: { value: '7' } })
    const baseUrl = screen.getByLabelText('baseUrl') as HTMLInputElement
    fireEvent.change(baseUrl, { target: { value: 'https://ark.example/v1' } })

    // Staged, not written: a control that committed as it settled would turn one
    // edit into a document mutation the user never asked for.
    expect(forms.mutate).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'save' }))

    await waitFor(() => { expect(forms.mutate).toHaveBeenCalledTimes(1) })
    const [ops, expectedRevision] = forms.mutate.mock.calls[0] ?? []
    // One revision-fenced write for the whole form, addressed by nested path.
    expect(ops).toHaveLength(2)
    expect(ops).toEqual(expect.arrayContaining([
      { op: 'set', path: ['provider', 'baseUrl'], value: 'https://ark.example/v1' },
      { op: 'set', path: ['concurrency'], value: 7 },
    ]))
    expect(expectedRevision).toBe(1)
    await waitFor(() => { expect(concurrency.value).toBe('7') })
  })

  it('clears a field back to the composition layer with an unset path op', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true, value: actionSnapshot() })))
    const { ctx, registrations, forms } = fakeClientContext(fakeConfigForms({ user: { concurrency: 4 } }))
    apply(ctx as never)
    renderPage(registrations)

    fireEvent.change(screen.getByLabelText('concurrency'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'save' }))

    await waitFor(() => { expect(forms.mutate).toHaveBeenCalledTimes(1) })
    expect(forms.mutate.mock.calls[0]?.[0]).toEqual([{ op: 'unset', path: ['concurrency'] }])
  })

  it('blocks the save on an invalid number instead of dropping the edit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true, value: actionSnapshot() })))
    const { ctx, registrations, forms } = fakeClientContext()
    apply(ctx as never)
    renderPage(registrations)

    fireEvent.change(screen.getByLabelText('timeout'), { target: { value: '12.5' } })
    expect(screen.getByText('invalidNumber')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'save' }))
    await waitFor(() => { expect(forms.mutate).not.toHaveBeenCalled() })
  })

  it('writes the credential literal through the credentials domain, never the settings section', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true, value: actionSnapshot() })))
    const credentials = fakeCredentials({ ARK_API_KEY: { configured: true, source: 'file', writable: true } })
    const { ctx, registrations, forms } = fakeClientContext(fakeConfigForms(), credentials)
    apply(ctx as never)
    renderPage(registrations)

    await waitFor(() => { expect(credentials.describe).toHaveBeenCalled() })
    const keyInput = screen.getByLabelText('apiKey') as HTMLInputElement
    fireEvent.change(keyInput, { target: { value: 'sk-browser-entry' } })
    fireEvent.click(screen.getByRole('button', { name: 'save' }))

    await waitFor(() => { expect(credentials.set).toHaveBeenCalledWith('ARK_API_KEY', 'sk-browser-entry') })
    // The literal never rides a settings mutation.
    for (const call of forms.mutate.mock.calls) {
      expect(JSON.stringify(call[0])).not.toContain('sk-browser-entry')
    }
    await waitFor(() => { expect((screen.getByLabelText('apiKey') as HTMLInputElement).value).toBe('') })
  })

  it('refuses a wrapped or environment-assignment key paste and clears the notice on the next edit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true, value: actionSnapshot() })))
    const credentials = fakeCredentials()
    const { ctx, registrations } = fakeClientContext(fakeConfigForms(), credentials)
    apply(ctx as never)
    renderPage(registrations)

    const keyInput = screen.getByLabelText('apiKey')
    fireEvent.change(keyInput, { target: { value: 'ARK_API_KEY=sk-value' } })
    fireEvent.click(screen.getByRole('button', { name: 'save' }))
    await screen.findByText('apiKeyInvalid')
    expect(credentials.set).not.toHaveBeenCalled()

    fireEvent.change(keyInput, { target: { value: 'sk-value' } })
    expect(screen.queryByText('apiKeyInvalid')).toBeNull()
  })

  it('addresses the TTS credential independently of the Ark key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true, value: actionSnapshot() })))
    const credentials = fakeCredentials({ VOLCENGINE_TTS_KEY: { configured: false, writable: true } })
    const { ctx, registrations } = fakeClientContext(fakeConfigForms(), credentials)
    apply(ctx as never)
    renderPage(registrations)

    await waitFor(() => { expect(credentials.describe).toHaveBeenCalledWith(['VOLCENGINE_TTS_KEY']) })
    fireEvent.change(screen.getByLabelText('ttsKey'), { target: { value: 'tts-token' } })
    fireEvent.click(screen.getByRole('button', { name: 'save' }))

    await waitFor(() => { expect(credentials.set).toHaveBeenCalledWith('VOLCENGINE_TTS_KEY', 'tts-token') })
  })

  it('disables every control for a read-only document and for a locked credential', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true, value: actionSnapshot() })))
    const credentials = fakeCredentials({ ARK_API_KEY: { configured: true, source: 'file', writable: false } })
    const { ctx, registrations } = fakeClientContext(fakeConfigForms({ writable: false }), credentials)
    apply(ctx as never)
    renderPage(registrations)

    expect((screen.getByLabelText('baseUrl') as HTMLInputElement).disabled).toBe(true)
    await waitFor(() => { expect((screen.getByLabelText('apiKey') as HTMLInputElement).disabled).toBe(true) })
    expect(screen.getByText('readOnly')).toBeTruthy()
  })

  it('keeps the drafts and reports the failure when the Host refuses a write', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true, value: actionSnapshot() })))
    const forms = fakeConfigForms()
    forms.mutate.mockResolvedValueOnce(false)
    const { ctx, registrations } = fakeClientContext(forms)
    apply(ctx as never)
    renderPage(registrations)

    fireEvent.change(screen.getByLabelText('concurrency'), { target: { value: '9' } })
    fireEvent.click(screen.getByRole('button', { name: 'save' }))

    await screen.findByText('saveFailed')
    expect((screen.getByLabelText('concurrency') as HTMLInputElement).value).toBe('9')
  })

  it('runs the local health check and the explicit Ark connection test through the actions route', async () => {
    const health = {
      pluginVersion: '0.1.0',
      checks: {
        credential: { status: 'ok', detail: 'credential ARK_API_KEY is resolvable' },
        ttsCredential: { status: 'ok', detail: 'credential VOLCENGINE_TTS_KEY is resolvable' },
        artifactDirectory: { status: 'ok', detail: 'Artifact directory is writable: /tmp/x' },
        service: { status: 'ok', detail: 'Service responded at https://ark.example/v1/models (HTTP 200)' },
      },
      healthy: true,
      connectionTested: true,
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, value: actionSnapshot() }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, value: health }))
    vi.stubGlobal('fetch', fetchMock)

    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    renderPage(registrations)

    fireEvent.click(await screen.findByRole('button', { name: 'testConnection' }))
    await screen.findByText('healthServiceResponded')
    // Both the Ark and the TTS credential resolve against the same fixture.
    expect(screen.getAllByText('healthCredentialReady')).toHaveLength(2)
    const request = fetchMock.mock.calls[1]?.[1] as RequestInit
    expect(JSON.parse(String(request.body))).toEqual({
      action: 'health',
      testConnection: true,
    })
  })

  it('checks for a plugin release and requires confirmation before update and restart', async () => {
    const update = {
      supported: true,
      profile: 'web',
      dependencySpec: '0.1.0',
      currentVersion: '0.1.0',
      latestVersion: '0.2.0',
      updateAvailable: true,
      checkedAt: '2026-08-16T12:00:00.000Z',
    }
    // A restart that never lands inside the deadline: the page reports the
    // timeout instead of reloading.
    const restart = {
      fromVersion: '0.1.0',
      toVersion: '0.2.0',
      profile: 'web',
      restarting: true,
      retryAfterMs: 0,
    }
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      const body = init?.body === undefined ? undefined : JSON.parse(String(init.body)) as { action?: string }
      if (body?.action === 'check-update') return Promise.resolve(jsonResponse({ ok: true, value: update }))
      if (body?.action === 'apply-update') return Promise.resolve(jsonResponse({ ok: true, value: restart }))
      return Promise.resolve(jsonResponse({ ok: true, value: actionSnapshot() }))
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    renderPage(registrations)

    fireEvent.click(await screen.findByRole('button', { name: 'checkUpdate' }))
    await screen.findByText('updateAvailableDetail')
    fireEvent.click(screen.getByRole('button', { name: 'updateNow' }))
    await screen.findByText('restarting')

    expect(window.confirm).toHaveBeenCalledTimes(1)
    const actions = fetchMock.mock.calls.map(call => JSON.parse(String((call[1] as RequestInit | undefined)?.body ?? '{}')) as { action?: string; expectedVersion?: string })
    expect(actions).toContainEqual({ action: 'check-update' })
    expect(actions).toContainEqual({ action: 'apply-update', expectedVersion: '0.2.0' })
  })

  it('links the Volcengine Ark tutorial and exposes a copyable manual update command', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true, value: actionSnapshot() })))
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    renderPage(registrations)

    const tutorial = await screen.findByRole('link', { name: 'arkTutorial' })
    expect(tutorial.getAttribute('href')).toBe('https://github.com/nextnowlabs/dsh-ark-toolkit/blob/main/docs/ark-doubao.md')

    const command = 'dsh plugin --profile web add @nextnowlabs/dsh-ark-toolkit@latest --registry=https://registry.npmjs.org/'
    const code = screen.getByText(command)
    expect(code.tagName).toBe('CODE')
    fireEvent.click(screen.getByRole('button', { name: 'copy' }))
    await waitFor(() => { expect(writeText).toHaveBeenCalledWith(command) })

    await screen.findByRole('button', { name: 'copied' })
  })

  it('reports a successful install and asks for a manual restart when self-restart is unavailable', async () => {
    const update = {
      supported: true,
      profile: 'web',
      dependencySpec: '0.1.0',
      currentVersion: '0.1.0',
      latestVersion: '0.2.0',
      updateAvailable: true,
      checkedAt: '2026-08-16T12:00:00.000Z',
    }
    const installed = {
      fromVersion: '0.1.0',
      toVersion: '0.2.0',
      profile: 'web',
      restarting: false,
      manualRestartRequired: true,
    }
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      const body = init?.body === undefined ? undefined : JSON.parse(String(init.body)) as { action?: string }
      if (body?.action === 'check-update') return Promise.resolve(jsonResponse({ ok: true, value: update }))
      if (body?.action === 'apply-update') return Promise.resolve(jsonResponse({ ok: true, value: installed }))
      return Promise.resolve(jsonResponse({ ok: true, value: actionSnapshot() }))
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    renderPage(registrations)

    fireEvent.click(await screen.findByRole('button', { name: 'checkUpdate' }))
    fireEvent.click(await screen.findByRole('button', { name: 'updateNow' }))
    await screen.findByText('manualRestartRequired')
  })

  it('blocks plugin installation while a draft or an API key is staged', async () => {
    const update = {
      supported: true,
      profile: 'web',
      dependencySpec: '0.1.0',
      currentVersion: '0.1.0',
      latestVersion: '0.2.0',
      updateAvailable: true,
      checkedAt: '2026-08-16T12:00:00.000Z',
    }
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      const body = init?.body === undefined ? undefined : JSON.parse(String(init.body)) as { action?: string }
      if (body?.action === 'check-update') return Promise.resolve(jsonResponse({ ok: true, value: update }))
      return Promise.resolve(jsonResponse({ ok: true, value: actionSnapshot() }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    renderPage(registrations)

    fireEvent.click(await screen.findByRole('button', { name: 'checkUpdate' }))
    const updateButton = await screen.findByRole('button', { name: 'updateNow' }) as HTMLButtonElement
    expect(updateButton.disabled).toBe(false)

    fireEvent.change(screen.getByLabelText('concurrency'), { target: { value: '5' } })
    expect(updateButton.disabled).toBe(true)
    expect(screen.getByText('updateSaveFirst')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('concurrency'), { target: { value: '4' } })
    const keyInput = screen.getByLabelText('apiKey') as HTMLInputElement
    expect(keyInput.disabled).toBe(false)
    fireEvent.change(keyInput, { target: { value: 'unsaved-secret' } })
    expect(updateButton.disabled).toBe(true)
  })

  it('surfaces the refused runtime generation the Host kept serving', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      ok: true,
      value: actionSnapshot({ ready: true, generation: 1, lastError: 'provider.baseUrl must be an http(s) URL' }),
    })))
    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    renderPage(registrations)

    await screen.findByText('provider.baseUrl must be an http(s) URL')
    expect(screen.getByText('runtimeCandidateRejected')).toBeTruthy()
  })

  it('reports an unavailable runtime instead of promising a probe', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      ok: true,
      value: actionSnapshot({ ready: false, generation: 0 }),
    })))
    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    renderPage(registrations)

    await waitFor(() => {
      expect((screen.getByRole('button', { name: 'runHealth' }) as HTMLButtonElement).disabled).toBe(true)
    })
  })
})
