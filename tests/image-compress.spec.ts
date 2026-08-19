import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { compressImage, cropRegionToDataUrl, imageToDataUrl, probeImage } from '../src/image-codec.ts'

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

async function writeNoiseImage(path: string, width: number, height: number, quality = 95): Promise<void> {
  const raw = Buffer.alloc(width * height * 3)
  for (let i = 0; i < raw.length; i += 1) raw[i] = Math.floor(Math.random() * 255)
  await sharp(raw, { raw: { width, height, channels: 3 } }).jpeg({ quality }).toFile(path)
}

describe('image-codec', () => {
  it('probes image dimensions, format, and channels', async () => {
    const root = await tempDir()
    const source = join(root, 'flat.png')
    await writeFlatImage(source, 800, 600, [200, 100, 50])
    const probed = await probeImage(source)
    expect(probed).toMatchObject({ width: 800, height: 600, format: 'png', mode: 'RGB' })
  })

  it('prefers a lossless re-encode when it fits the byte budget', async () => {
    const root = await tempDir()
    const source = join(root, 'flat.png')
    const dest = join(root, 'flat-out.png')
    await writeFlatImage(source, 800, 800, [200, 100, 50])

    const result = await compressImage(source, dest, 3000, 20_000_000)
    expect(result.lossy).toBe(false)
    expect(['png', 'webp']).toContain(result.format)
    expect(result.bytes).toBeLessThanOrEqual(3000)
    await expect(readFile(dest)).resolves.toBeDefined()
  }, 60_000)

  it('compresses a large noisy PNG below the byte budget', async () => {
    const root = await tempDir()
    const source = join(root, 'noisy.png')
    const dest = join(root, 'noisy-out.png')
    await writeNoiseImage(source, 1600, 1600)

    const result = await compressImage(source, dest, 4 * 1024 * 1024, 20_000_000)
    expect(result.bytes).toBeLessThanOrEqual(4 * 1024 * 1024)
    expect(result.width * result.height).toBeLessThanOrEqual(20_000_000)
    expect(['png', 'jpeg', 'webp']).toContain(result.format)
    await expect(readFile(dest)).resolves.toBeDefined()
  }, 120_000)

  it('downscales when the pixel budget requires it', async () => {
    const root = await tempDir()
    const source = join(root, 'pixel.png')
    const dest = join(root, 'pixel-out.png')
    await writeFlatImage(source, 800, 800, [10, 20, 30])

    const result = await compressImage(source, dest, 4 * 1024 * 1024, 100_000)
    expect(result.width * result.height).toBeLessThanOrEqual(100_000)
    expect(result.resized).toBe(true)
  }, 60_000)

  it('throws a capacity error when even the minimum image cannot fit', async () => {
    const root = await tempDir()
    const source = join(root, 'tiny.png')
    const dest = join(root, 'tiny-out.png')
    await writeFlatImage(source, 64, 64, [1, 2, 3])

    await expect(compressImage(source, dest, 8, 100_000)).rejects.toMatchObject({ code: 'capacity' })
  }, 60_000)

  it('crops a region to a PNG data URL', async () => {
    const root = await tempDir()
    const source = join(root, 'flat.png')
    await writeFlatImage(source, 100, 100, [10, 200, 30])
    const dataUrl = await cropRegionToDataUrl(source, { x1: 10, y1: 10, x2: 40, y2: 40 })
    expect(dataUrl).toMatch(/^data:image\/png;base64,.+$/u)
  })

  it('reads a whole image to a data URL', async () => {
    const root = await tempDir()
    const source = join(root, 'flat.png')
    await writeFlatImage(source, 64, 64, [5, 5, 5])
    const dataUrl = await imageToDataUrl(source)
    expect(dataUrl).toMatch(/^data:image\/png;base64,.+$/u)
  })
})
