/**
 * Plugin version facts. The pure-Node build has no pinned upstream snapshot:
 * image generation and speech synthesis call the configured ByteDance
 * services directly.
 * @module dsh-ark-toolkit/version
 */

import { readFileSync } from 'node:fs'

const metadata = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { version: string }

/** Plugin package version. */
export const PLUGIN_VERSION = metadata.version
