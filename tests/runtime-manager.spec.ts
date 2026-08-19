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
    runtimeName: config.provider.model,
  } as unknown as ArkToolkitRuntime
}

function config(model: string) {
  return {
    provider: { baseUrl: 'https://vision.example/v1', credential: 'VISION_API_KEY', model },
  }
}

describe('ArkToolkitRuntimeManager', () => {
  it('prepares before publishing and retains the serving generation after failure', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    const prepared: string[] = []
    const factory: RuntimeGenerationFactory = async (_ctx, resolved) => {
      prepared.push(resolved.provider.model)
      if (resolved.provider.model === 'broken') throw new Error('fixture runtime unavailable')
      return fakeRuntime(resolved)
    }
    const manager = new ArkToolkitRuntimeManager(ctx, factory)
    await manager.initialize(config('first'))
    const first = manager.current()

    await expect(manager.reconfigure(config('broken'))).rejects.toThrow('fixture runtime unavailable')
    expect(manager.current()).toBe(first)
    expect(manager.status()).toMatchObject({ ready: true, generation: 1, lastError: 'fixture runtime unavailable' })
    expect(prepared).toEqual(['first', 'broken'])
  })

  it('treats transparent-routing visibility as display-only so toggling it does not rebuild the runtime', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    const factory = vi.fn(async (_ctx: Context, resolved: ResolvedArkToolkitConfig) => fakeRuntime(resolved))
    const manager = new ArkToolkitRuntimeManager(ctx, factory)
    await manager.initialize(config('first'))
    expect(factory).toHaveBeenCalledTimes(1)

    const changed = await manager.reconfigure({ ...config('first'), imageInputVariants: { hidden: true } })

    expect(changed).toBe(false)
    expect(factory).toHaveBeenCalledTimes(1)
    expect(manager.status()).toMatchObject({ ready: true, generation: 1 })
    expect(manager.status().activeConfig?.imageInputVariants.hidden).toBe(true)
  })

  it('prevents a slower obsolete Settings prepare from overwriting a newer one', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    let releaseSlow: (() => void) | undefined
    const slow = new Promise<void>((resolve) => { releaseSlow = resolve })
    const factory: RuntimeGenerationFactory = async (_ctx, resolved) => {
      if (resolved.provider.model === 'slow') await slow
      return fakeRuntime(resolved)
    }
    const manager = new ArkToolkitRuntimeManager(ctx, factory)
    await manager.initialize(config('first'))

    const older = manager.reconfigure(config('slow'))
    await manager.reconfigure(config('newest'))
    releaseSlow?.()
    await older

    expect(manager.status().activeConfig?.provider.model).toBe('newest')
    expect((manager.current().runtimeInfo as { pluginVersion: string }).pluginVersion).toBe('fixture')
  })
})
