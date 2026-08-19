/**
 * Stable error vocabulary shared by the runtime, upstream adapter, and tools.
 * Every failure reaching the model carries one of these codes and a message
 * that never contains credentials or raw upstream stack traces.
 * @module dsh-ark-toolkit/errors
 */

/** Discriminant tag for every Ark Toolkit failure. */
export const ARK_TOOLKIT_ERROR_CODES = [
  'config',
  'input',
  'capacity',
  'service',
  'runtime',
  'output',
  'timeout',
  'cancelled',
  'path',
] as const

/** Stable machine-readable error category. */
export type ArkToolkitErrorCode = typeof ARK_TOOLKIT_ERROR_CODES[number]

/** Error with a stable category; safe to surface to the model. */
export class ArkToolkitError extends Error {
  readonly code: ArkToolkitErrorCode

  constructor(code: ArkToolkitErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'ArkToolkitError'
    this.code = code
  }
}

/**
 * Replace every known secret occurrence in untrusted text. Used before
 * upstream stderr, exit messages, or trace reports enter logs or results.
 * @param text - text that may embed a secret.
 * @param secrets - values that must never be surfaced.
 * @returns text with each secret replaced by a fixed marker.
 */
export function redactText(text: string, secrets: readonly string[]): string {
  let result = text
  for (const secret of secrets) {
    if (secret.length === 0) continue
    result = result.split(secret).join('<redacted>')
  }
  return result
}

/**
 * Build a model-safe upstream failure line: the tool prefix plus the
 * redacted stderr tail, never a JavaScript stack.
 * @param tool - upstream CLI name.
 * @param stderr - captured upstream stderr.
 * @param secrets - values to redact.
 * @returns one-line safe message.
 */
export function upstreamFailureMessage(tool: string, stderr: string, secrets: readonly string[]): string {
  const tail = redactText(stderr, secrets).trim().split(/\r?\n/).filter(Boolean).slice(-2).join(' ')
  return tail.length === 0 ? `${tool}: upstream command failed` : `${tool}: ${tail}`
}
