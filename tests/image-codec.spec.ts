import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { probeImage } from '../src/image-codec.ts'

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'dvt-image-codec-'))
  tempDirs.push(dir)
  return dir
}

async function writeFlatImage(path: string, width: number, height: number, rgb: [number, number, number]): Promise<void> {
  await sharp({ create: { width, height, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } } }).png().toFile(path)
}

describe('image-codec', () => {
  it('probes image dimensions, format, and channels', async () => {
    const root = await tempDir()
    const source = join(root, 'flat.png')
    await writeFlatImage(source, 800, 600, [200, 100, 50])
    const probed = await probeImage(source)
    expect(probed).toMatchObject({ width: 800, height: 600, format: 'png', mode: 'RGB' })
  })

  it('rejects a file that is not a decodable image', async () => {
    const root = await tempDir()
    const source = join(root, 'not-an-image.png')
    await sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 0, g: 0, b: 0 } } })
      .png()
      .toFile(source)
    await rm(source)
    await expect(probeImage(source)).rejects.toMatchObject({ code: 'input' })
  })
})
