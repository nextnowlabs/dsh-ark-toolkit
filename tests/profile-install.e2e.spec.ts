import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa, execaSync } from 'execa'
import { afterEach, describe, expect, it } from 'vitest'

/** Keyless real-profile acceptance: clean DSH_HOME install → boot → tool call → uninstall. */

const pluginDir = fileURLToPath(new URL('../', import.meta.url))
const repoRoot = pluginDir
const SAMPLE_IMAGE = 'tests/fixtures/sample.png'
const ARK_TOOLKIT_ACTIVATE = 'ark_toolkit_activate'
/**
 * DSH releases ship both a CLI version and package versions. The acceptance
 * run pins the exact prerelease the plugin targets: `0.1.6-alpha.1` and
 * `0.1.6-alpha.2` are NOT interchangeable (`dsh-client-ui-slots`,
 * `dsh-subprocess`, and the session projection surface all moved inside the
 * line), so accepting a sibling build would let a stale CLI silently skip the
 * real Profile path.
 */
const COMPATIBLE_DSH_VERSIONS = ['0.1.6-alpha.2'] as const
const REQUIRED_DSH_VERSION = COMPATIBLE_DSH_VERSIONS.join(' or ')
const ARK_TOOL_NAMES = [
  'ark_generate_image',
  'ark_speak',
] as const
const DIAGNOSTIC_TOOL_NAMES = ['ark_toolkit_health', 'ark_toolkit_version'] as const

interface ScriptedLlmRequest {
  body: unknown
}

type ScriptedLlmStep =
  | { kind: 'tool'; name: string; arguments: string }
  | { kind: 'text'; text: string }

function hasPnpm(): boolean {
  try {
    execaSync('pnpm', ['--version'], { timeout: 10_000 })
    return true
  } catch {
    return false
  }
}

function hasCompatibleDsh(): boolean {
  try {
    const version = execaSync('dsh', ['--version'], { timeout: 10_000 }).stdout.trim()
    return (COMPATIBLE_DSH_VERSIONS as readonly string[]).includes(version)
  } catch {
    return false
  }
}

function packPlugin(destination: string): string {
  const result = execaSync('npm', ['pack', '--ignore-scripts', '--pack-destination', destination, '--json'], {
    cwd: pluginDir,
    timeout: 120_000,
  })
  const rows = JSON.parse(result.stdout) as Array<{ filename?: unknown }>
  const filename = rows[0]?.filename
  if (typeof filename !== 'string' || filename.length === 0) {
    throw new Error(`npm pack returned no filename: ${result.stdout}`)
  }
  return join(destination, filename)
}

async function runDsh(
  args: readonly string[],
  env: Readonly<Record<string, string>>,
  cwd = repoRoot,
): Promise<{ stdout: string; stderr: string; code: number }> {
  const childEnv = Object.fromEntries(
    Object.entries({ ...process.env, ...env })
      .filter((entry): entry is [string, string] => entry[1] !== undefined),
  )
  const result = await execa('dsh', args, {
    input: '',
    timeout: 120_000,
    killSignal: 'SIGKILL',
    reject: false,
    env: childEnv,
    extendEnv: false,
    cwd,
  })
  if (result.timedOut) {
    throw new Error(`dsh did not exit within 120s. stdout:\n${result.stdout}\nstderr:\n${result.stderr}`)
  }
  return { stdout: result.stdout, stderr: result.stderr, code: result.exitCode ?? -1 }
}

/** Minimal Volcengine Ark stand-in: only `/v1/images/generations` is implemented. */
async function startMockArkServer() {
  const png = readFileSync(join(repoRoot, SAMPLE_IMAGE))
  const requests: Array<{ authorization: string | undefined; body: unknown }> = []
  const server = createServer((request, response) => {
    const chunks: Buffer[] = []
    request.on('data', chunk => chunks.push(Buffer.from(chunk)))
    request.on('end', () => {
      if (request.method !== 'POST' || request.url !== '/v1/images/generations') {
        response.writeHead(404, { 'content-type': 'application/json' })
        response.end('{"error":"not found"}')
        return
      }
      let body: unknown
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      } catch {
        response.writeHead(400, { 'content-type': 'application/json' })
        response.end('{"error":"invalid JSON"}')
        return
      }
      requests.push({ authorization: request.headers.authorization, body })
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] }))
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address() as AddressInfo
  return {
    baseURL: `http://127.0.0.1:${address.port}/v1`,
    requests,
    close: () => new Promise<void>((resolve, reject) => {
      server.close(error => error === undefined ? resolve() : reject(error))
      server.closeAllConnections()
    }),
  }
}

/**
 * Scripted stand-in for the DeepSeek **Messages** endpoint. DSH `0.1.6` made
 * `messages` the default `llm-deepseek` protocol, so the fixture answers
 * `/v1/messages` with Anthropic-style SSE blocks (`tool_use` for scripted tool
 * calls, `text` for a final answer) instead of OpenAI chat completions.
 */
async function startScriptedLlmServer(steps: readonly ScriptedLlmStep[]) {
  const requests: ScriptedLlmRequest[] = []
  let stepIndex = 0
  const server = createServer((request, response) => {
    const path = request.url ?? ''
    if (request.method !== 'POST' || !path.startsWith('/v1/messages')) {
      response.writeHead(404, { 'content-type': 'application/json' })
      response.end('{"error":"not found"}')
      return
    }
    const chunks: Buffer[] = []
    request.on('data', chunk => chunks.push(Buffer.from(chunk)))
    request.on('end', () => {
      let body: unknown
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      } catch {
        response.writeHead(400, { 'content-type': 'application/json' })
        response.end('{"error":"invalid JSON"}')
        return
      }
      requests.push({ body })
      const step = steps[stepIndex++]
      if (step === undefined) {
        response.writeHead(500, { 'content-type': 'application/json' })
        response.end('{"error":{"message":"script exhausted","type":"api_error"}}')
        return
      }
      response.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache',
        'connection': 'keep-alive',
      })
      const write = (payload: unknown): void => {
        response.write(`event: ${(payload as { type: string }).type}\ndata: ${JSON.stringify(payload)}\n\n`)
      }
      const model = typeof (body as { model?: unknown }).model === 'string'
        ? (body as { model: string }).model
        : 'fixture-model'
      write({
        type: 'message_start',
        message: {
          id: `msg_scripted_${stepIndex}`,
          type: 'message',
          role: 'assistant',
          model,
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 3, output_tokens: 0 },
        },
      })
      if (step.kind === 'tool') {
        write({
          type: 'content_block_start',
          index: 0,
          content_block: {
            type: 'tool_use',
            id: `scripted-call-${stepIndex}`,
            name: step.name,
            input: {},
          },
        })
        write({
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'input_json_delta', partial_json: step.arguments },
        })
        write({ type: 'content_block_stop', index: 0 })
        write({
          type: 'message_delta',
          delta: { stop_reason: 'tool_use', stop_sequence: null },
          usage: { output_tokens: 2 },
        })
      } else {
        write({
          type: 'content_block_start',
          index: 0,
          content_block: { type: 'text', text: '' },
        })
        write({
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: step.text },
        })
        write({ type: 'content_block_stop', index: 0 })
        write({
          type: 'message_delta',
          delta: { stop_reason: 'end_turn', stop_sequence: null },
          usage: { output_tokens: Array.from(step.text).length },
        })
      }
      write({ type: 'message_stop' })
      response.end()
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address() as AddressInfo
  return {
    baseURL: `http://127.0.0.1:${address.port}/v1`,
    requests,
    close: () => new Promise<void>((resolve, reject) => {
      server.close(error => error === undefined ? resolve() : reject(error))
      server.closeAllConnections()
    }),
  }
}

async function startProgressiveToolServer(
  toolName: string,
  toolArguments: string,
  successText: string,
  activation: 'skill' | 'direct' = 'skill',
) {
  return startScriptedLlmServer([
    activation === 'skill'
      ? { kind: 'tool', name: 'skill', arguments: JSON.stringify({ name: 'ark-skills' }) }
      : { kind: 'tool', name: ARK_TOOLKIT_ACTIVATE, arguments: '{}' },
    { kind: 'tool', name: toolName, arguments: toolArguments },
    { kind: 'text', text: successText },
  ])
}

function requestToolNames(request: ScriptedLlmRequest | undefined): string[] {
  // Messages serializes tools flat (`{name, description, input_schema}`),
  // unlike the chat-completions `{function: {name}}` envelope.
  const body = request?.body as {
    tools?: Array<{ name?: unknown }>
  } | undefined
  return body?.tools
    ?.map(tool => tool.name)
    .filter((name): name is string => typeof name === 'string') ?? []
}

function expectProgressiveExposure(requests: readonly ScriptedLlmRequest[]): void {
  expect(requests).toHaveLength(3)
  const initial = requestToolNames(requests[0])
  expect(initial).toContain('skill')
  expect(initial).toContain(ARK_TOOLKIT_ACTIVATE)
  for (const name of ARK_TOOL_NAMES) expect(initial).not.toContain(name)

  for (const request of requests.slice(1)) {
    const names = requestToolNames(request)
    for (const name of ARK_TOOL_NAMES) expect(names).toContain(name)
    expect(names).not.toContain(ARK_TOOLKIT_ACTIVATE)
  }
  for (const request of requests) {
    const names = requestToolNames(request)
    for (const name of DIAGNOSTIC_TOOL_NAMES) expect(names).not.toContain(name)
  }
}

function fixturePatch(home: string, arkBaseUrl: string): string {
  const path = join(home, 'fixture-patch.yml')
  writeFileSync(path, [
    '- id: ark-toolkit',
    '  config:',
    '    provider:',
    `      baseUrl: ${arkBaseUrl}`,
    '      credential: ARK_API_KEY',
    '    timeoutMs: 60000',
    '    concurrency: 4',
    '- id: session-title-llm',
    '  disabled: true',
    '',
  ].join('\n'))
  return path
}

const profileE2eAvailable = hasCompatibleDsh() && hasPnpm()
if (process.env.DSH_ARK_REQUIRE_PROFILE_E2E === '1' && !profileE2eAvailable) {
  throw new Error(`DSH_ARK_REQUIRE_PROFILE_E2E=1 requires dsh ${REQUIRED_DSH_VERSION} and pnpm on PATH`)
}

describe.skipIf(!profileE2eAvailable)('dsh-ark-toolkit profile install (keyless e2e)', () => {
  const homes: string[] = []

  afterEach(() => {
    for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true })
  })

  it('installs, boots, calls ark_generate_image through the real profile, and uninstalls cleanly', async () => {
    const home = mkdtempSync(join(tmpdir(), 'dsh-ark-profile-'))
    homes.push(home)
    const packageDir = join(home, 'package')
    mkdirSync(packageDir)
    const tarball = packPlugin(packageDir)
    const arkServer = await startMockArkServer()
    const patch = fixturePatch(home, arkServer.baseURL)

    // pnpm 11 gates native build scripts per workspace; DSH initializes a bare
    // profile workspace, so the plugin's sharp binary build must be approved up
    // front (the same edit `dsh plugin` tells users to make when a build script
    // is ignored).
    const profileDir = join(home, 'profiles', 'headless')
    mkdirSync(profileDir, { recursive: true })
    writeFileSync(join(profileDir, 'pnpm-workspace.yaml'), [
      'packages:',
      '  - .',
      '',
      'nodeLinker: hoisted',
      'autoInstallPeers: false',
      'allowBuilds:',
      '  sharp: true',
      '',
    ].join('\n'))

    try {
      const add = await runDsh(['plugin', '--profile', 'headless', 'add', tarball], { DSH_HOME: home })
      expect(add.code, add.stderr).toBe(0)

      const dump = await runDsh(['--profile', 'headless', '--dump-config'], { DSH_HOME: home })
      expect(dump.stdout).toContain('- id: ark-toolkit')
      expect(dump.stdout).toContain("name: '@nextnowlabs/dsh-ark-toolkit'")

      const workspace = join(home, 'workspace')
      mkdirSync(workspace)

      const server = await startProgressiveToolServer(
        'ark_generate_image',
        JSON.stringify({ prompt: '一只戴帽子的橘猫', output: 'cat.png' }),
        'generation done',
      )
      try {
        const run = await runDsh([
          '--profile', 'headless', '--patch', patch,
          'generate a picture of a cat',
        ], {
          DSH_HOME: home,
          DSH_TELEMETRY_DISABLED: '1',
          DEEPSEEK_API_KEY: 'mock-ark-e2e-key',
          DEEPSEEK_BASE_URL: server.baseURL,
          ARK_API_KEY: 'fixture-ark-key',
        }, workspace)
        expect(run.code, run.stderr).toBe(0)
        expect(run.stdout).toBe('generation done')
        // Portability contract for the bundle install: the plugin must resolve
        // schemastery from the host instead of dragging in a profile-local copy.
        // DSH 0.1.6 stopped hoisting host-scoped packages into `profiles/`, so
        // neither name may appear in the profile's own node_modules — a bare
        // `schemastery` here would break Windows bundle installs.
        const profileModules = join(home, 'profiles', 'headless', 'node_modules')
        expect(existsSync(join(profileModules, 'schemastery'))).toBe(false)
        expect(existsSync(join(profileModules, '@deepseek-ai'))).toBe(false)
        expectProgressiveExposure(server.requests)
        const bodies = JSON.stringify(server.requests.map(request => request.body))
        expect(bodies).toContain('ark_generate_image')
        expect(arkServer.requests).toHaveLength(1)
        expect(arkServer.requests[0]?.authorization).toBe('Bearer fixture-ark-key')
        expect(JSON.stringify(arkServer.requests[0]?.body)).toContain('一只戴帽子的橘猫')
        // The generated artifact landed inside the session workspace.
        expect(existsSync(join(workspace, '.dsh-ark-toolkit', 'artifacts', 'cat.png'))).toBe(true)
      } finally {
        await server.close()
      }

      const disablePatch = join(home, 'disable.yml')
      writeFileSync(disablePatch, [
        '- id: ark-toolkit',
        '  disabled: true',
        '',
      ].join('\n'))
      const disabledServer = await startScriptedLlmServer([{ kind: 'text', text: 'disabled ok' }])
      try {
        const disabled = await runDsh([
          '--profile', 'headless', '--patch', patch, '--patch', disablePatch,
          'say ok',
        ], {
          DSH_HOME: home,
          DSH_TELEMETRY_DISABLED: '1',
          DEEPSEEK_API_KEY: 'mock-ark-e2e-key',
          DEEPSEEK_BASE_URL: disabledServer.baseURL,
          ARK_API_KEY: 'fixture-ark-key',
        })
        expect(disabled.code, disabled.stderr).toBe(0)
        expect(disabled.stdout).toBe('disabled ok')
        const disabledBodies = JSON.stringify(disabledServer.requests.map(request => request.body))
        expect(disabledBodies).not.toContain('ark-skills')
        expect(disabledBodies).not.toContain(ARK_TOOLKIT_ACTIVATE)
        for (const name of [...ARK_TOOL_NAMES, ...DIAGNOSTIC_TOOL_NAMES]) {
          expect(disabledBodies).not.toContain(name)
        }
      } finally {
        await disabledServer.close()
      }

      const reenabledServer = await startProgressiveToolServer(
        'ark_speak',
        JSON.stringify({ text: '你好', output: 'hi.mp3' }),
        're-enabled ok',
        'direct',
      )
      try {
        const reenabled = await runDsh([
          '--profile', 'headless', '--patch', patch,
          '/ark-skills confirm the Ark Toolkit is available again',
        ], {
          DSH_HOME: home,
          DSH_TELEMETRY_DISABLED: '1',
          DEEPSEEK_API_KEY: 'mock-ark-e2e-key',
          DEEPSEEK_BASE_URL: reenabledServer.baseURL,
          ARK_API_KEY: 'fixture-ark-key',
        })
        expect(reenabled.code, reenabled.stderr).toBe(0)
        expect(reenabled.stdout).toBe('re-enabled ok')
        expectProgressiveExposure(reenabledServer.requests)
        expect(JSON.stringify(reenabledServer.requests[0]?.body)).toContain('<skill_content')
        const reenabledBodies = JSON.stringify(reenabledServer.requests.map(request => request.body))
        expect(reenabledBodies).toContain('ark_speak')
      } finally {
        await reenabledServer.close()
      }

      const remove = await runDsh(['plugin', '--profile', 'headless', 'remove', '@nextnowlabs/dsh-ark-toolkit'], {
        DSH_HOME: home,
      })
      expect(remove.code, remove.stderr).toBe(0)
      const dumpAfter = await runDsh(['--profile', 'headless', '--dump-config'], { DSH_HOME: home })
      expect(dumpAfter.stdout).not.toContain('ark-toolkit')
    } finally {
      await arkServer.close()
    }
  }, 300_000)
})
