/**
 * @nextnowlabs/dsh-ark-toolkit — DSH Ark Toolkit profile bundle.
 *
 * Plugin lifecycle follows the documented readiness chain: publish the
 * ark-skills Skill and its one-shot bootstrap, then mount the execution
 * tools only in Agents that load that Skill or invoke the bootstrap. Any
 * failure leaves no model capability behind, and disposal unregisters every
 * global and Agent-scoped contribution the plugin mounted.
 * @module @nextnowlabs/dsh-ark-toolkit
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-settings'
import { ArtifactAccessController, prepareArtifactAccessKey } from './artifact-access.ts'
import {
  Config,
  ARK_TOOLKIT_SETTINGS_NAMESPACE,
  resolveConfig,
  type ArkToolkitConfig,
} from './config.ts'
import { ArkToolExposure } from './exposure.ts'
import { createPasteTakeoverResolver, installImageInputVariants } from './image-input-variants.ts'
import { ArkToolkitRuntimeManager } from './runtime-manager.ts'
import { ARK_SKILLS_SKILL } from './skill.ts'
import { createArkTools } from './tools.ts'
import { PLUGIN_VERSION } from './version.ts'
import { installArkToolkitWeb, ArkToolkitWebBackend } from './web.ts'
import { MAX_PASTE_IMAGE_BYTES, PastedImageBackend } from './paste-images.ts'

export const name = '@nextnowlabs/dsh-ark-toolkit'

export { Config }

export const inject = ['tools', 'credentials', 'skills', 'subprocess', 'settings', 'agents', 'sessions']

/** Plugin entry: validate configuration synchronously, then mount asynchronously. */
export async function apply(ctx: Context, config: ArkToolkitConfig = {}): Promise<() => void> {
  // Registration itself rejects an invalid stored section before any runtime
  // or Tool becomes visible. The custom Web editor preflights runtime changes
  // before persistence; hand-edited settings still fail loud here or retain
  // the last serving generation when changed live.
  const settings = ctx.settings.register(ARK_TOOLKIT_SETTINGS_NAMESPACE, Config, {
    base: config,
    applies: 'live',
    validate: (value) => { resolveConfig(value) },
  })
  const manager = new ArkToolkitRuntimeManager(ctx)
  const artifacts = new ArtifactAccessController(await prepareArtifactAccessKey())
  const lifecycle = new AbortController()
  const disposers: Array<() => void> = []
  let operationalDisposers: { activationTool: () => void; exposure: () => void; skill: () => void } | undefined

  const ensureOperational = (): void => {
    if (!manager.ready || operationalDisposers !== undefined) return
    const exposure = new ArkToolExposure(ctx, () => createArkTools(
      () => manager.current(),
      value => artifacts.presentationMeta(value),
      lifecycle.signal,
    ))
    let activationTool: (() => void) | undefined
    let exposureDisposer: (() => void) | undefined
    let skill: (() => void) | undefined
    try {
      activationTool = ctx.tools.register(exposure.activationTool)
      skill = ctx.skills.register(ARK_SKILLS_SKILL)
      exposureDisposer = exposure.install()
      operationalDisposers = { activationTool, exposure: exposureDisposer, skill }
      ctx.logger.info('dsh-ark-toolkit %s ready (pure-node runtime)', PLUGIN_VERSION)
    } catch (error) {
      exposureDisposer?.()
      if (skill !== undefined) skill()
      activationTool?.()
      throw error
    }
  }

  try {
    await manager.initialize(settings.get())
    ensureOperational()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    ctx.logger.error(
      'dsh-ark-toolkit %s: runtime not ready; the ark-skills skill, activation bootstrap, and Agent-scoped visual tools are NOT registered. Settings remain available for repair. %s',
      PLUGIN_VERSION,
      message,
    )
  }

  const backend = new ArkToolkitWebBackend(ctx, manager, artifacts, ensureOperational)
  const pastedImages = new PastedImageBackend(ctx, {
    maxUploadBytes: () => MAX_PASTE_IMAGE_BYTES,
  })
  // Image-input variants register asynchronously once eligible routes exist;
  // the runtime getter stays lazy so variants appear even when the runtime
  // becomes ready after the first sweep.
  const variants = installImageInputVariants(
    ctx,
    () => resolveConfig(settings.get()),
    () => manager.ready ? manager.current() : undefined,
  )
  installArkToolkitWeb(
    ctx,
    backend,
    artifacts,
    pastedImages,
    createPasteTakeoverResolver(ctx, () => resolveConfig(settings.get())),
    () => ({ hidden: resolveConfig(settings.get()).imageInputVariants.hidden }),
  )
  disposers.push(variants.dispose)
  disposers.push(settings.watch(async (next) => {
    try {
      await manager.reconfigure(next)
      ensureOperational()
      variants.reconcile()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      ctx.logger.error('dsh-ark-toolkit: keeping the previous runtime after a refused Settings generation. %s', message)
    }
  }))

  return () => {
    lifecycle.abort()
    if (operationalDisposers !== undefined) {
      operationalDisposers.exposure()
      operationalDisposers.activationTool()
      operationalDisposers.skill()
      operationalDisposers = undefined
    }
    for (const dispose of disposers.reverse()) dispose()
  }
}
