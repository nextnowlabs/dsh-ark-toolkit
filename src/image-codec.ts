/**
 * Pure-Node image codec backed by sharp. Probe, crop, and lossless-first
 * compression replace the former vendored Pillow runtime — no Python involved.
 * @module dsh-ark-toolkit/image-codec
 */

import sharp from 'sharp'
import { ArkToolkitError } from './errors.ts'

/** Probed image facts shared by validation and artifacts. */
export interface ProbedImage {
  width: number
  height: number
  format: 'png' | 'jpeg' | 'gif' | 'webp'
  mode: string
}

/** Result of one sharp compression pass for an oversized image. */
export interface CompressedImageInfo {
  bytes: number
  width: number
  height: number
  format: 'png' | 'jpeg' | 'gif' | 'webp'
  lossy: boolean
  resized: boolean
}

/** Read image dimensions and format without decoding pixel data. */
export async function probeImage(path: string): Promise<ProbedImage> {
  let metadata: sharp.Metadata
  try {
    metadata = await sharp(path).metadata()
  } catch (error) {
    throw new ArkToolkitError('input', `cannot decode image: ${error instanceof Error ? error.message : 'unsupported or corrupt file'}`)
  }
  const width = metadata.width
  const height = metadata.height
  const format = metadata.format ?? 'unknown'
  if (
    typeof width !== 'number' || !Number.isInteger(width) || width <= 0
    || typeof height !== 'number' || !Number.isInteger(height) || height <= 0
    || (format !== 'png' && format !== 'jpeg' && format !== 'gif' && format !== 'webp')
  ) {
    throw new ArkToolkitError('input', 'cannot decode image: unsupported or corrupt file')
  }
  return { width, height, format, mode: metadata.channels === 4 ? 'RGBA' : metadata.channels === 2 ? 'LA' : 'RGB' }
}

/** Crop a pixel box and return it as a base64 PNG data URL (used for glance region). */
export async function cropRegionToDataUrl(
  path: string,
  region: { x1: number; y1: number; x2: number; y2: number },
): Promise<string> {
  let buffer: Buffer
  try {
    const width = region.x2 - region.x1
    const height = region.y2 - region.y1
    if (width <= 0 || height <= 0) {
      throw new ArkToolkitError('input', 'crop region must have x2 > x1 and y2 > y1')
    }
    buffer = await sharp(path)
      .extract({ left: region.x1, top: region.y1, width, height })
      .png()
      .toBuffer()
  } catch (error) {
    if (error instanceof ArkToolkitError) throw error
    throw new ArkToolkitError('input', `cannot crop image: ${error instanceof Error ? error.message : 'crop failed'}`)
  }
  return `data:image/png;base64,${buffer.toString('base64')}`
}

/** Read a whole image and return it as a base64 data URL. */
export async function imageToDataUrl(path: string): Promise<string> {
  let bytes: Buffer
  try {
    bytes = await sharp(path).toBuffer()
  } catch (error) {
    throw new ArkToolkitError('input', `cannot read image: ${error instanceof Error ? error.message : 'read failed'}`)
  }
  const format = await probeImage(path).then(info => info.format).catch(() => 'png' as const)
  const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : format === 'gif' ? 'image/gif' : 'image/png'
  return `data:${mime};base64,${bytes.toString('base64')}`
}

/**
 * Lossless-first compression ladder: try PNG then WebP-lossless re-encodes,
 * then WebP/JPEG quality reduction, and only downscale when none fit the
 * configured byte/pixel budget. Always writes exactly one file.
 * @returns facts about the written file.
 */
export async function compressImage(
  sourcePath: string,
  destPath: string,
  maxBytes: number,
  maxPixels: number,
): Promise<CompressedImageInfo> {
  const source = await probeImage(sourcePath)
  let width = source.width
  let height = source.height
  const hasAlpha = source.mode === 'RGBA' || source.mode === 'LA'
  const minEdge = 64
  const maxSteps = 4

  const fits = (w: number, h: number, bytes: number): boolean => w >= 1 && h >= 1 && w * h <= maxPixels && bytes <= maxBytes

  let best: { bytes: number; lossy: boolean; resized: boolean; candidate: string } | undefined

  const saveCandidate = async (
    pipeline: sharp.Sharp,
    lossy: boolean,
    resized: boolean,
    candidate: string,
  ): Promise<{ fits: boolean; bytes: number }> => {
    let buffer: Buffer
    try {
      buffer = await pipeline.toBuffer()
    } catch {
      return { fits: false, bytes: Number.POSITIVE_INFINITY }
    }
    const bytes = buffer.length
    if (best === undefined || bytes < best.bytes) {
      best = { bytes, lossy, resized, candidate }
    }
    return { fits: fits(width, height, bytes), bytes }
  }

  const build = (): sharp.Sharp => {
    let pipeline = sharp(sourcePath)
    if (width !== source.width || height !== source.height) {
      pipeline = pipeline.resize(width, height, { fit: 'fill', kernel: 'lanczos3' })
    }
    return pipeline
  }

  const qualitySteps = [90, 75, 60, 45]

  for (let step = 0; step <= maxSteps; step += 1) {
    const overPixels = width * height > maxPixels
    if (!overPixels) {
      // Lossless first.
      await saveCandidate(build().png({ compressionLevel: 9, adaptiveFiltering: true }), false, step > 0, 'png-lossless')
      await saveCandidate(build().webp({ lossless: true, quality: 100, effort: 6 }), false, step > 0, 'webp-lossless')
      // Lossy options.
      if (hasAlpha) {
        for (const quality of qualitySteps) {
          await saveCandidate(build().webp({ quality, effort: 6 }), true, step > 0, `webp-q${quality}`)
        }
        await saveCandidate(build().flatten({ background: '#ffffff' }).jpeg({ quality: 90, progressive: true }), true, step > 0, 'jpeg-q90-flatten')
      } else {
        for (const quality of qualitySteps) {
          await saveCandidate(build().jpeg({ quality, progressive: true }), true, step > 0, `jpeg-q${quality}`)
          await saveCandidate(build().webp({ quality, effort: 6 }), true, step > 0, `webp-q${quality}`)
        }
      }
      if (best !== undefined && fits(width, height, best.bytes)) break
    }
    if (step >= maxSteps || Math.min(width, height) <= minEdge) break
    // Downscale based on the binding constraint: the smaller ratio (more
    // aggressive scale) is the one that actually brings both budgets under
    // control. Using the larger ratio lets a non-binding ratio (e.g. bytes
    // when no candidate was computed yet) stall pixel-budget downscaling.
    const pixelRatio = width * height > maxPixels
      ? Math.sqrt(maxPixels / (width * height))
      : 1
    const byteRatio = best !== undefined && best.bytes > maxBytes
      ? Math.sqrt((maxBytes * 0.92) / best.bytes)
      : 1
    const ratio = Math.max(0.6, Math.min(0.95, Math.min(pixelRatio, byteRatio)))
    const nextWidth = Math.max(minEdge, Math.floor(width * ratio))
    const nextHeight = Math.max(minEdge, Math.floor(height * ratio))
    if (nextWidth === width && nextHeight === height) break
    width = nextWidth
    height = nextHeight
  }

  if (best === undefined || !fits(width, height, best.bytes)) {
    throw new ArkToolkitError('capacity', `cannot compress image under ${maxBytes} bytes / ${maxPixels} pixels`)
  }
  // Re-run the best candidate to actually write the file.
  const pipeline = build()
  let finalFormat: CompressedImageInfo['format'] = 'png'
  let lossy = best.lossy
  if (best.candidate.startsWith('webp')) {
    finalFormat = 'webp'
    if (best.candidate === 'webp-lossless') {
      await pipeline.webp({ lossless: true, quality: 100, effort: 6 }).toFile(destPath)
    } else {
      const quality = Number(best.candidate.slice('webp-q'.length)) || 90
      await pipeline.webp({ quality, effort: 6 }).toFile(destPath)
    }
  } else if (best.candidate.startsWith('jpeg')) {
    finalFormat = 'jpeg'
    const quality = Number(best.candidate.slice('jpeg-q'.length).replace('-flatten', '')) || 90
    await pipeline.flatten({ background: '#ffffff' }).jpeg({ quality, progressive: true }).toFile(destPath)
    lossy = true
  } else {
    await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(destPath)
  }
  const written = await probeImage(destPath)
  const size = (await import('node:fs/promises')).stat(destPath).then(info => info.size)
  return {
    bytes: await size,
    width: written.width,
    height: written.height,
    format: finalFormat,
    lossy,
    resized: best.resized,
  }
}
