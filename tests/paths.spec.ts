import { lstat, mkdtemp, mkdir, readFile, realpath, symlink, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  commitStagedOutput,
  commitStagedDirectory,
  createPathPolicy,
  createStagedDirectory,
  createStagedOutput,
  normalizePlatformTempPath,
  platformTempDirectory,
  resolveAuthorizedFile,
  resolveHtmlFile,
  resolveOutputDirectory,
  resolveOutputFile,
  seedStagedDirectory,
} from '../src/paths.ts'
import { ArkToolkitError } from '../src/errors.ts'

const tempDirs: string[] = []
async function tempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), `dsh-ark-toolkit-${prefix}-`))
  tempDirs.push(dir)
  return dir
}

async function outsideTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(homedir(), `.dsh-ark-toolkit-${prefix}-`))
  tempDirs.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => import('node:fs/promises').then(fs => fs.rm(dir, { recursive: true, force: true }))))
})

describe('createPathPolicy', () => {
  it('creates the plugin output directory inside the workspace', async () => {
    const workspace = await tempDir('workspace')
    const policy = await createPathPolicy(workspace, [])
    expect(policy.workspace).toBe(await realpath(workspace))
    expect(policy.outputDir).toBe(await realpath(join(workspace, '.dsh-ark-toolkit', 'artifacts')))
  })

  it('rejects an output directory outside the fence', async () => {
    const workspace = await tempDir('workspace')
    const outside = await outsideTempDir('outside')
    await expect(createPathPolicy(workspace, [], join(outside, 'out')))
      .rejects.toMatchObject({ code: 'path' })
  })

  it('resolves and realpaths allowedDirs', async () => {
    const workspace = await tempDir('workspace')
    const allowed = await tempDir('allowed')
    const policy = await createPathPolicy(workspace, [allowed])
    expect(policy.allowedDirs).toContain(await realpath(allowed))
  })

  it('includes the platform temporary directory in the input fence', async () => {
    const workspace = await tempDir('workspace')
    const policy = await createPathPolicy(workspace, [])
    expect(policy.tempDir).toBe(await realpath(platformTempDirectory()))
    expect(policy.allowedDirs).toContain(policy.tempDir)
  })
})

describe('platform temporary paths', () => {
  it('maps model-generated POSIX temp paths to Windows TEMP', () => {
    expect(platformTempDirectory('win32', { TEMP: 'C:\\Users\\tester\\AppData\\Local\\Temp' } as NodeJS.ProcessEnv))
      .toBe('C:\\Users\\tester\\AppData\\Local\\Temp')
    expect(normalizePlatformTempPath(
      '/tmp/screenshot.png',
      'win32',
      'C:\\Users\\tester\\AppData\\Local\\Temp',
    )).toBe('C:\\Users\\tester\\AppData\\Local\\Temp\\screenshot.png')
    expect(normalizePlatformTempPath('/tmp', 'win32', 'C:\\Temp'))
      .toBe('C:\\Temp')
    expect(platformTempDirectory('win32', { TEMP: ' ', TMP: 'D:\\Temp' } as NodeJS.ProcessEnv))
      .toBe('D:\\Temp')
    expect(normalizePlatformTempPath('/tmp-file.png', 'win32', 'C:\\Temp'))
      .toBe('/tmp-file.png')
  })

  it('does not rewrite POSIX temp paths on POSIX platforms', () => {
    expect(platformTempDirectory('linux')).toBe('/tmp')
    expect(normalizePlatformTempPath('/tmp/screenshot.png', 'linux', '/var/tmp'))
      .toBe('/tmp/screenshot.png')
  })
})

describe('resolveAuthorizedFile', () => {
  const EXTENSIONS = ['.png', '.webp'] as const

  it('accepts a workspace file and reports bytes', async () => {
    const workspace = await tempDir('workspace')
    await writeFile(join(workspace, 'a.png'), 'data')
    const policy = await createPathPolicy(workspace, [])
    const file = await resolveAuthorizedFile('a.png', policy, EXTENSIONS, 'image')
    expect(file.path).toBe(await realpath(join(workspace, 'a.png')))
    expect(file.bytes).toBe(4)
  })

  it('accepts a file inside an allowedDir', async () => {
    const workspace = await tempDir('workspace')
    const allowed = await tempDir('allowed')
    await writeFile(join(allowed, 'b.webp'), 'data')
    const policy = await createPathPolicy(workspace, [allowed])
    const file = await resolveAuthorizedFile(join(allowed, 'b.webp'), policy, EXTENSIONS, 'image')
    expect(file.path).toBe(await realpath(join(allowed, 'b.webp')))
  })

  it('accepts a file in the platform temporary directory', async () => {
    const workspace = await tempDir('workspace')
    const temporary = await mkdtemp(join(platformTempDirectory(), 'dsh-ark-toolkit-platform-temp-'))
    tempDirs.push(temporary)
    const path = join(temporary, 'temporary.png')
    await writeFile(path, 'data')
    const policy = await createPathPolicy(workspace, [])
    const input = process.platform === 'win32'
      ? `/tmp/${basename(temporary)}/temporary.png`
      : path
    const file = await resolveAuthorizedFile(input, policy, EXTENSIONS, 'image')
    expect(file.path).toBe(await realpath(path))
  })

  it('rejects missing files, directories, and unsupported extensions', async () => {
    const workspace = await tempDir('workspace')
    await mkdir(join(workspace, 'dir.png'))
    await writeFile(join(workspace, 'doc.txt'), 'x')
    const policy = await createPathPolicy(workspace, [])
    await expect(resolveAuthorizedFile('missing.png', policy, EXTENSIONS, 'image')).rejects.toMatchObject({ code: 'input' })
    await expect(resolveAuthorizedFile('dir.png', policy, EXTENSIONS, 'image')).rejects.toMatchObject({ code: 'input' })
    await expect(resolveAuthorizedFile('doc.txt', policy, EXTENSIONS, 'image')).rejects.toMatchObject({ code: 'input' })
  })

  it('rejects traversal and absolute escapes', async () => {
    const workspace = await tempDir('workspace')
    const outside = await outsideTempDir('outside')
    await writeFile(join(outside, 'x.png'), 'data')
    const policy = await createPathPolicy(workspace, [])
    await expect(resolveAuthorizedFile('../x.png', policy, EXTENSIONS, 'image')).rejects.toMatchObject({ code: 'input' })
    await expect(resolveAuthorizedFile(join(outside, 'x.png'), policy, EXTENSIONS, 'image')).rejects.toMatchObject({ code: 'path' })
  })

  it('rejects a symlink whose real target escapes the fence', async () => {
    const workspace = await tempDir('workspace')
    const outside = await outsideTempDir('outside')
    await writeFile(join(outside, 'secret.png'), 'data')
    await symlink(join(outside, 'secret.png'), join(workspace, 'link.png'))
    const policy = await createPathPolicy(workspace, [])
    await expect(resolveAuthorizedFile('link.png', policy, EXTENSIONS, 'image')).rejects.toMatchObject({ code: 'path' })
  })

  it('allows a symlink whose real target stays inside the fence', async () => {
    const workspace = await tempDir('workspace')
    await writeFile(join(workspace, 'real.png'), 'data')
    await symlink(join(workspace, 'real.png'), join(workspace, 'link.png'))
    const policy = await createPathPolicy(workspace, [])
    const file = await resolveAuthorizedFile('link.png', policy, EXTENSIONS, 'image')
    expect(file.path).toBe(await realpath(join(workspace, 'real.png')))
  })
})

describe('resolveOutputFile', () => {
  it('defaults into the plugin output directory with the given name', async () => {
    const workspace = await tempDir('workspace')
    const policy = await createPathPolicy(workspace, [])
    const output = resolveOutputFile('out.svg', policy, 'default.svg', ['.svg'])
    expect(output).toBe(join(policy.outputDir, 'out.svg'))
    const fallback = resolveOutputFile(undefined, policy, 'default.svg', ['.svg'])
    expect(fallback).toBe(join(policy.outputDir, 'default.svg'))
  })

  it('rejects absolute paths, nested names, traversal, and wrong extensions', async () => {
    const workspace = await tempDir('workspace')
    const policy = await createPathPolicy(workspace, [])
    expect(() => resolveOutputFile('/tmp/x.svg', policy, 'd.svg', ['.svg'])).toThrowError(/absolute/)
    expect(() => resolveOutputFile('../x.svg', policy, 'd.svg', ['.svg'])).toThrowError(/one filename/)
    expect(() => resolveOutputFile('nested/x.svg', policy, 'd.svg', ['.svg'])).toThrowError(/one filename/)
    expect(() => resolveOutputFile('x.png', policy, 'd.svg', ['.svg'])).toThrowError(/must use one of/)
  })

  it('commits a random staging file into the final name', async () => {
    const workspace = await tempDir('workspace')
    const policy = await createPathPolicy(workspace, [])
    const staged = createStagedOutput(policy, '.svg')
    const finalPath = resolveOutputFile('result.svg', policy, 'default.svg', ['.svg'])
    await writeFile(staged, '<svg/>\n')
    await commitStagedOutput(staged, finalPath, policy)
    expect(await readFile(finalPath, 'utf8')).toBe('<svg/>\n')
  })

  it('replaces a destination symlink itself without writing through it', async () => {
    const workspace = await tempDir('workspace')
    const outside = await outsideTempDir('outside')
    const protectedPath = join(outside, 'protected.svg')
    await writeFile(protectedPath, 'outside\n')
    const policy = await createPathPolicy(workspace, [])
    const finalPath = resolveOutputFile('result.svg', policy, 'default.svg', ['.svg'])
    await symlink(protectedPath, finalPath)
    const staged = createStagedOutput(policy, '.svg')
    await writeFile(staged, '<svg/>\n')
    await commitStagedOutput(staged, finalPath, policy)
    expect((await lstat(finalPath)).isSymbolicLink()).toBe(false)
    expect(await readFile(finalPath, 'utf8')).toBe('<svg/>\n')
    expect(await readFile(protectedPath, 'utf8')).toBe('outside\n')
  })
})

describe('managed artifact directories', () => {
  it('accepts local HTML but rejects URL-shaped and wrong-extension sources', async () => {
    const workspace = await tempDir('workspace')
    await writeFile(join(workspace, 'page.html'), '<!doctype html>\n')
    await writeFile(join(workspace, 'page.txt'), 'text\n')
    const policy = await createPathPolicy(workspace, [])
    expect((await resolveHtmlFile('page.html', policy)).path).toBe(await realpath(join(workspace, 'page.html')))
    await expect(resolveHtmlFile('https://example.com', policy)).rejects.toMatchObject({ code: 'input' })
    await expect(resolveHtmlFile('page.txt', policy)).rejects.toMatchObject({ code: 'input' })
  })

  it('commits complete run directories and seeds an explicit resume staging area', async () => {
    const workspace = await tempDir('workspace')
    const policy = await createPathPolicy(workspace, [])
    const finalPath = resolveOutputDirectory('run-one', policy, 'default-run')
    const staged = await createStagedDirectory(policy)
    await writeFile(join(staged, 'result.json'), '{"ok":true}\n')
    await commitStagedDirectory(staged, finalPath, policy)
    expect(await readFile(join(finalPath, 'result.json'), 'utf8')).toContain('true')

    const resume = await createStagedDirectory(policy)
    expect(await seedStagedDirectory(finalPath, resume, policy)).toBe(true)
    expect(await readFile(join(resume, 'result.json'), 'utf8')).toContain('true')
  })

  it('restores the previous run only from a real managed directory', async () => {
    const workspace = await tempDir('workspace')
    const outside = await outsideTempDir('outside')
    const policy = await createPathPolicy(workspace, [])
    const finalPath = resolveOutputDirectory('run-link', policy, 'default-run')
    await symlink(outside, finalPath)
    const staged = await createStagedDirectory(policy)
    await expect(seedStagedDirectory(finalPath, staged, policy)).rejects.toMatchObject({ code: 'path' })
  })

  it('rejects symbolic links anywhere inside a staged run directory', async () => {
    const workspace = await tempDir('workspace')
    const outside = await outsideTempDir('outside')
    const policy = await createPathPolicy(workspace, [])
    const staged = await createStagedDirectory(policy)
    await writeFile(join(outside, 'secret.txt'), 'secret\n')
    await symlink(join(outside, 'secret.txt'), join(staged, 'result.txt'))
    const finalPath = resolveOutputDirectory('unsafe-run', policy, 'default-run')
    await expect(commitStagedDirectory(staged, finalPath, policy)).rejects.toMatchObject({ code: 'path' })
  })

  it('rejects nested, absolute, and reserved artifact directory names', async () => {
    const workspace = await tempDir('workspace')
    const policy = await createPathPolicy(workspace, [])
    expect(() => resolveOutputDirectory('../run', policy, 'default')).toThrowError(/one visible directory name/)
    expect(() => resolveOutputDirectory('/tmp/run', policy, 'default')).toThrowError(/absolute/)
    expect(() => resolveOutputDirectory('.ark-toolkit-owned', policy, 'default')).toThrowError(/one visible directory name/)
  })
})
