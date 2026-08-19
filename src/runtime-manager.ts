/**
 * Atomic live configuration owner for the plugin's internal runtime. A new
 * runtime is fully constructed before it replaces the currently serving one,
 * so failed Settings edits never interrupt in-flight or later calls.
 * @module dsh-ark-toolkit/runtime-manager
 */

import type { Context } from '@deepseek-ai/cordis'
import { resolveConfig, type ResolvedArkToolkitConfig, type ArkToolkitConfig } from './config.ts'
import { ArkToolkitRuntime } from './runtime.ts'

/** One completely validated configuration generation. */
export interface PreparedRuntimeGeneration {
  config: ResolvedArkToolkitConfig
  fingerprint: string
  runtime: ArkToolkitRuntime
}

/** Public, secret-free status used by the Settings page. */
export interface RuntimeManagerStatus {
  ready: boolean
  generation: number
  activeConfig?: ResolvedArkToolkitConfig
  lastError?: string
}

/** Test seam for preparing one generation. */
export type RuntimeGenerationFactory = (
  ctx: Context,
  config: ResolvedArkToolkitConfig,
) => Promise<ArkToolkitRuntime>

async function defaultFactory(ctx: Context, config: ResolvedArkToolkitConfig): Promise<ArkToolkitRuntime> {
  return new ArkToolkitRuntime(ctx, config)
}

function fingerprint(config: ResolvedArkToolkitConfig): string {
  // Transparent routing is a display/policy flag: toggling it must not rebuild
  // the runtime, only reconcile the model-selector routes.
  return JSON.stringify({
    ...config,
    imageInputVariants: { ...config.imageInputVariants, hidden: false },
  })
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Internal runtime source with prepare-before-swap semantics. */
export class ArkToolkitRuntimeManager {
  private active: PreparedRuntimeGeneration | undefined
  private generation = 0
  private reconfigureTicket = 0
  private lastError: string | undefined

  constructor(
    private readonly ctx: Context,
    private readonly factory: RuntimeGenerationFactory = defaultFactory,
  ) {}

  /** The currently serving runtime; unavailable until one generation prepares. */
  current(): ArkToolkitRuntime {
    if (this.active === undefined) throw new Error('dsh-ark-toolkit runtime is not ready')
    return this.active.runtime
  }

  /** Whether at least one generation is available. */
  get ready(): boolean {
    return this.active !== undefined
  }

  /** Resolve and fully prepare a candidate without changing the active runtime. */
  async prepareCandidate(raw: ArkToolkitConfig): Promise<PreparedRuntimeGeneration> {
    const config = resolveConfig(raw)
    const resolvedFingerprint = fingerprint(config)
    if (this.active?.fingerprint === resolvedFingerprint) {
      return { ...this.active, config }
    }
    const runtime = await this.factory(this.ctx, config)
    return { config, fingerprint: resolvedFingerprint, runtime }
  }

  /**
   * Publish one already-prepared generation atomically.
   * @param candidate - generation returned by {@link prepareCandidate}.
   */
  activateCandidate(candidate: PreparedRuntimeGeneration): void {
    if (this.active?.fingerprint === candidate.fingerprint) {
      this.active = candidate
      this.lastError = undefined
      return
    }
    this.reconfigureTicket += 1
    this.active = candidate
    this.generation += 1
    this.lastError = undefined
    this.ctx.logger.info('dsh-ark-toolkit runtime generation=%d active', this.generation)
  }

  /** Prepare and publish the initial or explicitly validated generation. */
  async initialize(raw: ArkToolkitConfig): Promise<void> {
    try {
      this.activateCandidate(await this.prepareCandidate(raw))
    } catch (error) {
      this.lastError = messageOf(error)
      throw error
    }
  }

  /**
   * Apply an externally committed Settings generation. Concurrent edits are
   * last-write-wins; a slower obsolete prepare can never overwrite a newer one.
   * @returns whether this call published a new active generation.
   */
  async reconfigure(raw: ArkToolkitConfig): Promise<boolean> {
    const ticket = ++this.reconfigureTicket
    let candidate: PreparedRuntimeGeneration
    try {
      candidate = await this.prepareCandidate(raw)
    } catch (error) {
      if (ticket === this.reconfigureTicket) this.lastError = messageOf(error)
      throw error
    }
    if (ticket !== this.reconfigureTicket) return false
    const changed = this.active?.fingerprint !== candidate.fingerprint
    this.active = candidate
    if (changed) {
      this.generation += 1
      this.ctx.logger.info('dsh-ark-toolkit Settings activated runtime generation=%d', this.generation)
    }
    this.lastError = undefined
    return changed
  }

  /** Record a failed preflight while retaining the previous generation. */
  recordFailure(error: unknown): void {
    this.lastError = messageOf(error)
  }

  /** Secret-free status snapshot for health/configuration surfaces. */
  status(): RuntimeManagerStatus {
    if (this.active === undefined) {
      return {
        ready: false,
        generation: this.generation,
        ...(this.lastError === undefined ? {} : { lastError: this.lastError }),
      }
    }
    return {
      ready: true,
      generation: this.generation,
      activeConfig: this.active.config,
      ...(this.lastError === undefined ? {} : { lastError: this.lastError }),
    }
  }
}
