// @vitest-environment jsdom

import { createElement, type ComponentType } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-chat/client'
import { apply, decodeArkResult, inject, ArkSettingsController } from '../src/client/index.tsx'

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

function fakeClientContext() {
  const registrations: Array<{ options: Record<string, unknown>; component: ComponentType<Record<string, unknown>> }> = []
  const effects: Array<() => void> = []
  const on = vi.fn(() => () => {})
  const slots = {
    inject: vi.fn((_name: string, callback: () => unknown) => {
      const result = callback()
      if (result !== null && typeof result === 'object' && Symbol.iterator in result) {
        for (const dispose of result as Iterable<() => void>) effects.push(dispose)
      } else if (typeof result === 'function') {
        effects.push(result as () => void)
      }
    }),
    register: vi.fn((options: Record<string, unknown>, component: ComponentType<Record<string, unknown>>) => {
      registrations.push({ options, component })
      return () => {}
    }),
  }
  const ctx = {
    slots,
    locale: {
      register: vi.fn(() => () => {}),
      bind: vi.fn(() => (key: string) => key),
    },
    remote: { $on: vi.fn(() => () => {}) },
    effect: vi.fn((setup: () => void | (() => void)) => {
      const dispose = setup()
      if (typeof dispose === 'function') effects.push(dispose)
    }),
    on,
    inject: vi.fn((services: string[], callback: (scope: unknown) => void) => {
      if (services.every(service => service in ctx)) callback(ctx)
    }),
  }
  return { ctx, slots, registrations, effects, on }
}

function settingsSnapshot(runtime: { ready: boolean; lastError?: string } = { ready: true }) {
  return {
    schemaVersion: 1,
    writable: true,
    settings: {
      value: {
        provider: {
          baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
          credential: 'ARK_API_KEY',
          userAgent: 'fixture-agent/1.0',
        },
        timeoutMs: 61000,
        concurrency: 4,
      },
      revision: 1,
      applies: 'live',
    },
    credential: { ref: 'ARK_API_KEY', configured: false, writable: true },
    credentialTts: { ref: 'VOLCENGINE_TTS_KEY', configured: false, writable: true },
    runtime: {
      ...runtime,
      generation: 1,
    },
    release: {
      pluginVersion: '0.1.0',
      update: { supported: true, profile: 'web', dependencySpec: '0.1.0' },
    },
    artifactRouteAvailable: true,
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
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
function componentOf(registrations: ReturnType<typeof fakeClientContext>['registrations'], key: string) {
  const found = registrations.find(entry => entry.options.key === key)
  if (found === undefined) throw new Error(`${key} component was not registered`)
  return found.component
}

describe('Ark Toolkit client plugin', () => {
  it('registers every dedicated Tool view and the Settings card', () => {
    expect(inject).toEqual(['slots', 'locale', 'remote'])
    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    const remote = ctx.remote as { $on: ReturnType<typeof vi.fn> }
    expect(remote.$on).toHaveBeenCalledWith('settings/document-updated', expect.any(Function))
    expect(remote.$on).toHaveBeenCalledWith('credentials/reference-updated', expect.any(Function))
    expect(ctx.on).toHaveBeenCalledWith('connection/reset', expect.any(Function))

    const toolKeys = registrations
      .filter(entry => entry.options.name === 'tool.call.toolview')
      .map(entry => entry.options.key)
    expect(toolKeys).toEqual([
      'ark_generate_image',
      'ark_speak',
    ])
    expect(registrations.find(entry => entry.options.name === 'settings.plugin.item')?.options).toMatchObject({
      key: 'ark-toolkit',
    })
  })

  it('refreshes the Settings card only for its own namespace and credential references', () => {
    const { ctx } = fakeClientContext()
    apply(ctx as never)
    const remote = ctx.remote as { $on: ReturnType<typeof vi.fn> }
    const settingsListener = remote.$on.mock.calls.find(call => call[0] === 'settings/document-updated')?.[1] as (ns: string) => void
    const credentialListener = remote.$on.mock.calls.find(call => call[0] === 'credentials/reference-updated')?.[1] as (ref: string) => void
    // Unloaded controller: every refresh is a cheap no-op, so this only proves
    // the listeners are wired and never throw on unrelated names.
    expect(() => { settingsListener('other-plugin') }).not.toThrow()
    expect(() => { settingsListener('ark-toolkit') }).not.toThrow()
    expect(() => { credentialListener('OTHER_KEY') }).not.toThrow()
    expect(() => { credentialListener('ARK_API_KEY') }).not.toThrow()
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
    expect(css).toContain('.dvt-plugin-card{list-style:none;margin:0;display:grid;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);overflow:hidden')
    expect(css).toContain('.dvt-card-head{display:flex;align-items:center;gap:10px;width:100%;padding:12px 14px;border:0;background:transparent')
    expect(css).toContain('.dvt-settings{display:grid;gap:12px}')
    expect(css).toContain('.dvt-panel{')
    expect(css).toContain('.dvt-panel-title{display:flex;align-items:flex-start;justify-content:space-between')
    expect(css).toContain('.dvt-advanced-body{display:grid;grid-template-columns:minmax(0,1fr)')
    expect(css).not.toContain('dvt-paste-')
    expect(css).not.toMatch(/--dsw-alias-(?:fg-primary|fg-muted|border-subtle)/u)
    expect(css).not.toMatch(/var\(--dsw-[^,)]+,/u)
    expect(css).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(/iu)
  })

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

  it('puts the required service fields first and the plugin identity at the bottom', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true, value: settingsSnapshot() })))

    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    const settings = registrations.find(entry => entry.options.name === 'settings.plugin.item')
    if (settings === undefined) throw new Error('Settings card was not registered')
    const view = render(createElement(settings.component, {
      controller: new ArkSettingsController(),
      t: (key: string) => key,
    }))

    fireEvent.click(await screen.findByRole('button', { name: 'expand: settingsTitle' }))

    await screen.findAllByText('0.1.0')
    expect(screen.getByLabelText('apiKey')).toBeTruthy()
    const root = view.container.querySelector('.dvt-settings')
    const essential = view.container.querySelector('.dvt-essential')
    const advanced = view.container.querySelector('.dvt-advanced')
    const footer = view.container.querySelector('.dvt-settings-footer')
    expect(root?.firstElementChild).not.toBe(footer)
    expect(root?.querySelector('.dvt-essential')).toBe(essential)
    expect(root?.lastElementChild).toBe(footer)
    expect(advanced).not.toBeNull()
    expect(advanced?.contains(screen.getByLabelText('credential'))).toBe(true)
    expect(view.container.querySelector('.dvt-plugin-card')?.tagName).toBe('LI')
    expect(view.container.querySelector('.dvt-card-head')).not.toBeNull()
  })

  it('renders the Settings card collapsed with the credential state in the header', async () => {
    const initial = settingsSnapshot()
    initial.credential = { ref: 'ARK_API_KEY', configured: true, source: 'file', writable: false }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true, value: initial })))

    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    const settings = registrations.find(entry => entry.options.name === 'settings.plugin.item')
    if (settings === undefined) throw new Error('Settings card was not registered')
    const view = render(createElement(settings.component, {
      controller: new ArkSettingsController(),
      t: (key: string) => key,
    }))

    const head = await screen.findByRole('button', { name: 'expand: settingsTitle' })
    expect(head.getAttribute('aria-expanded')).toBe('false')
    const body = view.container.querySelector('.dvt-card-body')
    expect(body?.hasAttribute('hidden')).toBe(true)
    const pill = view.container.querySelector('.dvt-card-pill')
    expect(pill?.textContent).toBe('configured')
    expect(pill?.getAttribute('data-status')).toBe('ok')

    fireEvent.click(head)
    expect(head.getAttribute('aria-expanded')).toBe('true')
    expect(body?.hasAttribute('hidden')).toBe(false)
    await screen.findByLabelText('apiKey')
    expect(screen.getByRole('button', { name: 'collapse: settingsTitle' })).toBeTruthy()
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
    const restart = {
      fromVersion: '0.1.0',
      toVersion: '0.2.0',
      profile: 'web',
      restarting: true,
      retryAfterMs: 60_000,
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, value: settingsSnapshot() }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, value: update }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, value: restart }))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    const settings = registrations.find(entry => entry.options.name === 'settings.plugin.item')
    if (settings === undefined) throw new Error('Settings card was not registered')
    render(createElement(settings.component, {
      controller: new ArkSettingsController(),
      t: (key: string) => key,
    }))

    fireEvent.click(await screen.findByRole('button', { name: 'expand: settingsTitle' }))

    fireEvent.click(await screen.findByRole('button', { name: 'checkUpdate' }))
    await screen.findByText('updateAvailableDetail')
    fireEvent.click(screen.getByRole('button', { name: 'updateNow' }))
    await screen.findByText('restarting')

    expect(window.confirm).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body))).toEqual({ action: 'check-update' })
    expect(JSON.parse(String((fetchMock.mock.calls[2]?.[1] as RequestInit).body))).toEqual({
      action: 'apply-update',
      expectedVersion: '0.2.0',
    })
  })

  it('links the Volcengine Ark tutorial and exposes a copyable manual update command', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true, value: settingsSnapshot() })))
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    const settings = registrations.find(entry => entry.options.name === 'settings.plugin.item')
    if (settings === undefined) throw new Error('Settings card was not registered')
    render(createElement(settings.component, {
      controller: new ArkSettingsController(),
      t: (key: string) => key,
    }))

    fireEvent.click(await screen.findByRole('button', { name: 'expand: settingsTitle' }))

    const tutorial = await screen.findByRole('link', { name: 'arkTutorial' })
    expect(tutorial.getAttribute('href')).toBe('https://github.com/nextnowlabs/dsh-ark-toolkit/blob/main/docs/ark-doubao.md')

    const command = 'dsh plugin --profile web add @nextnowlabs/dsh-ark-toolkit@latest --registry=https://registry.npmjs.org/'
    const code = screen.getByText(command)
    expect(code.tagName).toBe('CODE')
    fireEvent.click(screen.getByRole('button', { name: 'copy' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(command))

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
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, value: settingsSnapshot() }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, value: update }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, value: installed }))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    const settings = registrations.find(entry => entry.options.name === 'settings.plugin.item')
    if (settings === undefined) throw new Error('Settings card was not registered')
    render(createElement(settings.component, {
      controller: new ArkSettingsController(),
      t: (key: string) => key,
    }))

    fireEvent.click(await screen.findByRole('button', { name: 'expand: settingsTitle' }))

    fireEvent.click(await screen.findByRole('button', { name: 'checkUpdate' }))
    fireEvent.click(await screen.findByRole('button', { name: 'updateNow' }))
    await screen.findByText('manualRestartRequired')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('blocks plugin installation while Settings or the API key field has unsaved changes', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, value: settingsSnapshot() }))
      .mockResolvedValueOnce(jsonResponse({
        ok: true,
        value: {
          supported: true,
          profile: 'web',
          dependencySpec: '0.1.0',
          currentVersion: '0.1.0',
          latestVersion: '0.2.0',
          updateAvailable: true,
          checkedAt: '2026-08-16T12:00:00.000Z',
        },
      }))
    vi.stubGlobal('fetch', fetchMock)

    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    const settings = registrations.find(entry => entry.options.name === 'settings.plugin.item')
    if (settings === undefined) throw new Error('Settings card was not registered')
    render(createElement(settings.component, {
      controller: new ArkSettingsController(),
      t: (key: string) => key,
    }))

    fireEvent.click(await screen.findByRole('button', { name: 'expand: settingsTitle' }))

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

  it('locks the API key input for a read-only credential', async () => {
    const initial = settingsSnapshot()
    initial.credential = {
      ref: 'ARK_API_KEY', configured: true, source: 'file', writable: false,
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({ ok: true, value: initial })))

    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    const settings = registrations.find(entry => entry.options.name === 'settings.plugin.item')
    if (settings === undefined) throw new Error('Settings card was not registered')
    render(createElement(settings.component, {
      controller: new ArkSettingsController(),
      t: (key: string) => key,
    }))

    fireEvent.click(await screen.findByRole('button', { name: 'expand: settingsTitle' }))

    const keyInput = await screen.findByLabelText('apiKey') as HTMLInputElement
    expect(keyInput.disabled).toBe(true)
  })

  it('runs the local health check and the explicit Ark connection test', async () => {
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
      .mockResolvedValueOnce(jsonResponse({ ok: true, value: settingsSnapshot() }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, value: health }))
    vi.stubGlobal('fetch', fetchMock)

    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    const settings = registrations.find(entry => entry.options.name === 'settings.plugin.item')
    if (settings === undefined) throw new Error('Settings card was not registered')
    render(createElement(settings.component, {
      controller: new ArkSettingsController(),
      t: (key: string) => key,
    }))

    fireEvent.click(await screen.findByRole('button', { name: 'expand: settingsTitle' }))

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

  it('saves Settings first, then stores the typed API key without sending it in Settings', async () => {
    const initial = settingsSnapshot()
    const savedSettings = {
      ...initial,
      settings: { ...initial.settings, revision: 2 },
    }
    const savedCredential = {
      ...savedSettings,
      credential: { ...savedSettings.credential, configured: true, source: 'file' },
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, value: initial }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, value: savedSettings }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, value: savedCredential }))
    vi.stubGlobal('fetch', fetchMock)

    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    const settings = registrations.find(entry => entry.options.name === 'settings.plugin.item')
    if (settings === undefined) throw new Error('Settings card was not registered')
    render(createElement(settings.component, {
      controller: new ArkSettingsController(),
      t: (key: string) => key,
    }))

    fireEvent.click(await screen.findByRole('button', { name: 'expand: settingsTitle' }))

    const keyInput = await screen.findByLabelText('apiKey') as HTMLInputElement
    fireEvent.change(keyInput, { target: { value: 'sk-browser-entry' } })
    fireEvent.click(screen.getByRole('button', { name: 'save' }))

    await screen.findByText('saved')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const settingsBody = JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit | undefined)?.body)) as Record<string, unknown>
    const credentialBody = JSON.parse(String((fetchMock.mock.calls[2]?.[1] as RequestInit | undefined)?.body)) as Record<string, unknown>
    expect(settingsBody.action).toBe('save')
    expect(JSON.stringify(settingsBody)).not.toContain('sk-browser-entry')
    expect(credentialBody).toEqual({
      action: 'credential', expectedRevision: 2, ref: 'ARK_API_KEY', value: 'sk-browser-entry',
    })
    expect(keyInput.value).toBe('')
  })

  it('clears a key validation message as soon as the user edits the field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true, value: settingsSnapshot() })))
    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    const settings = registrations.find(entry => entry.options.name === 'settings.plugin.item')
    if (settings === undefined) throw new Error('Settings card was not registered')
    render(createElement(settings.component, {
      controller: new ArkSettingsController(),
      t: (key: string) => key,
    }))

    fireEvent.click(await screen.findByRole('button', { name: 'expand: settingsTitle' }))

    const keyInput = await screen.findByLabelText('apiKey')
    fireEvent.change(keyInput, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'save' }))
    expect(screen.getByText('apiKeyBlank')).toBeTruthy()

    fireEvent.change(keyInput, { target: { value: '' } })
    expect(screen.queryByText('apiKeyBlank')).toBeNull()
  })

  it('reloads the authoritative same-revision settings after a runtime candidate is rejected', async () => {
    const initial = settingsSnapshot()
    const rejected = settingsSnapshot({
      ready: true,
      lastError: 'provider.baseUrl must be an http(s) URL',
    })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, value: initial }))
      .mockResolvedValueOnce(jsonResponse({
        ok: false,
        error: { code: 'INVALID_CONFIG', message: 'provider.baseUrl must be an http(s) URL' },
      }, 400))
      .mockResolvedValueOnce(jsonResponse({ ok: true, value: rejected }))
    vi.stubGlobal('fetch', fetchMock)

    const { ctx, registrations } = fakeClientContext()
    apply(ctx as never)
    const settings = registrations.find(entry => entry.options.name === 'settings.plugin.item')
    if (settings === undefined) throw new Error('Settings card was not registered')
    render(createElement(settings.component, {
      controller: new ArkSettingsController(),
      t: (key: string) => key,
    }))

    fireEvent.click(await screen.findByRole('button', { name: 'expand: settingsTitle' }))

    const concurrency = await screen.findByLabelText('concurrency')
    fireEvent.change(concurrency, { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: 'save' }))
    await screen.findByText('provider.baseUrl must be an http(s) URL')
    const saveRequest = fetchMock.mock.calls[1]?.[1] as RequestInit
    expect(JSON.parse(String(saveRequest.body))).toMatchObject({
      value: {
        concurrency: 7,
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'reload' }))
    await waitFor(() => {
      expect((screen.getByLabelText('baseUrl') as HTMLInputElement).value).toBe('https://ark.cn-beijing.volces.com/api/v3')
    })
    expect(screen.getByText('runtimeCandidateRejected')).toBeTruthy()
    expect(screen.queryByText('runtimeUnavailable')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
