import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ResolvedArkToolkitConfig } from '../src/config.ts'
import type { ArkToolkitRuntime } from '../src/runtime.ts'
import { ArkToolkitRuntimeManager, type RuntimeGenerationFactory } from '../src/runtime-manager.ts'

const contexts: Context[] = []

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
})

function fakeRuntime(config: ResolvedArkToolkitConfig): ArkToolkitRuntime {
  return {
    runtimeInfo: { pluginVersion: 'fixture', runtime: 'pure-node' as const },
    runtimeName: config.provider.credential,
  } as unknown as ArkToolkitRuntime
}

function config(credential: string) {
  return {
    provider: { baseUrl: 'https://ark.example/v1', credential },
  }
}

describe('ArkToolkitRuntimeManager', () => {
  it('prepares before publishing and retains the serving generation after failure', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    const prepared: string[] = []
    const factory: RuntimeGenerationFactory = async (_ctx, resolved) => {
      prepared.push(String(resolved.provider.credential))
      if (String(resolved.provider.credential) === 'BROKEN_KEY') throw new Error('fixture runtime unavailable')
      return fakeRuntime(resolved)
    }
    const manager = new ArkToolkitRuntimeManager(ctx, factory)
    await manager.initialize(config('FIRST_KEY'))
    const first = manager.current()

    await expect(manager.reconfigure(config('BROKEN_KEY'))).rejects.toThrow('fixture runtime unavailable')
    expect(manager.current()).toBe(first)
    expect(manager.status()).toMatchObject({ ready: true, generation: 1, lastError: 'fixture runtime unavailable' })
    expect(prepared).toEqual(['FIRST_KEY', 'BROKEN_KEY'])
  })

  it('reuses the serving generation when a reconfigure resolves to an identical config', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    const factory = vi.fn(async (_ctx: Context, resolved: ResolvedArkToolkitConfig) => fakeRuntime(resolved))
    const manager = new ArkToolkitRuntimeManager(ctx, factory)
    await manager.initialize(config('FIRST_KEY'))
    expect(factory).toHaveBeenCalledTimes(1)

    const changed = await manager.reconfigure(config('FIRST_KEY'))

    expect(changed).toBe(false)
    expect(factory).toHaveBeenCalledTimes(1)
    expect(manager.status()).toMatchObject({ ready: true, generation: 1 })
  })

  it('prevents a slower obsolete Settings prepare from overwriting a newer one', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    let releaseSlow: (() => void) | undefined
    const slow = new Promise<void>((resolve) => { releaseSlow = resolve })
    const factory: RuntimeGenerationFactory = async (_ctx, resolved) => {
      if (String(resolved.provider.credential) === 'SLOW_KEY') await slow
      return fakeRuntime(resolved)
    }
    const manager = new ArkToolkitRuntimeManager(ctx, factory)
    await manager.initialize(config('FIRST_KEY'))

    const older = manager.reconfigure(config('SLOW_KEY'))
    await manager.reconfigure(config('NEWEST_KEY'))
    releaseSlow?.()
    await older

    expect(manager.status().activeConfig?.provider.credential).toBe('NEWEST_KEY')
    expect((manager.current().runtimeInfo as { pluginVersion: string }).pluginVersion).toBe('fixture')
  })
})
