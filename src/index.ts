/**
 * @nextnowlabs/dsh-ark-toolkit — DSH Ark Toolkit profile bundle.
 *
 * Plugin lifecycle follows the documented readiness chain: publish the
 * ark-skills Skill and its one-shot bootstrap, then mount the execution
 * tools only in Agents that load that Skill or invoke the bootstrap. Any
 * failure leaves no model capability behind, and disposal unregisters every
 * global and Agent-scoped contribution the plugin mounted.
 *
 * Configuration follows the DSH `0.1.7` model: the plugin's Loader entry is
 * its settings section, every Config field is a live reference, and a
 * committed write updates those references in place. The plugin therefore
 * rebuilds its runtime from the committed values instead of waiting for a
 * remount that never comes.
 * @module @nextnowlabs/dsh-ark-toolkit
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-settings'
import { ArtifactAccessController, prepareArtifactAccessKey } from './artifact-access.ts'
import {
  Config,
  readArkToolkitConfig,
  type ArkToolkitConfig,
  type ArkToolkitConfigRefs,
} from './config.ts'
import { ArkToolExposure } from './exposure.ts'
import { ArkToolkitRuntimeManager } from './runtime-manager.ts'
import { ARK_SKILLS_SKILL } from './skill.ts'
import { createArkTools } from './tools.ts'
import { PLUGIN_VERSION } from './version.ts'
import { installArkToolkitWeb, ArkToolkitWebBackend } from './web.ts'

export const name = '@nextnowlabs/dsh-ark-toolkit'

export { Config }

export const inject = ['tools', 'credentials', 'skills', 'subprocess', 'agents', 'sessions']

/** Plugin entry: validate configuration synchronously, then mount asynchronously. */
export async function apply(ctx: Context, config: ArkToolkitConfigRefs): Promise<() => void> {
  // The section *is* this entry's own config, so a stored value the schema
  // rejects never reaches this function. Cross-field rules the schema cannot
  // express are judged by `resolveConfig` on the initial value below, by every
  // Settings write (the Host validates a candidate before persisting it), and
  // again on each committed change — where an unservable value keeps the last
  // working generation instead of failing the mount.
  //
  // Configuration is a *UI* concern of this bundle, not a capability: the Ark
  // tools work from the entry's config whether or not a profile mounts a
  // settings service, so the service is injected optionally. This bundle ships
  // its own page on the Plugins panel, so the generic per-entry form for the
  // same section stays off — a policy keyed by this plugin's own fiber, which
  // is what the settings service looks up.
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber))
  })
  const liveConfig = (): ArkToolkitConfig => readArkToolkitConfig(config)
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

  // An initial configuration the schema accepts but `resolveConfig` refuses
  // aborts activation outright, exactly as a schema violation would: mounting
  // the Skill and bootstrap for a runtime that cannot serve a request would
  // promise the model a capability that never works. The Loader reports the
  // refusing field, which is the actionable repair path for a hand-edited
  // patch. A *live* change is different — see the volatile-update listener.
  await manager.initialize(liveConfig())
  ensureOperational()

  const backend = new ArkToolkitWebBackend(ctx, manager, artifacts)
  installArkToolkitWeb(ctx, backend, artifacts)

  // A volatile write is committed straight into the references this plugin
  // holds and announced on this fiber alone, so this is the plugin's only
  // notification that its configuration moved.
  disposers.push(ctx.on('loader/volatile-update', () => {
    void manager.reconfigure(liveConfig())
      .then(() => { ensureOperational() })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        ctx.logger.error('dsh-ark-toolkit: keeping the previous runtime after a refused configuration change. %s', message)
      })
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
