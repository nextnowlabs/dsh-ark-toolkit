/**
 * Pure-Node image probe backed by sharp: read the dimensions and format of a
 * generated image without decoding pixel data. There is no Python runtime and
 * no vendored pixel toolkit involved.
 * @module dsh-ark-toolkit/image-codec
 */

import sharp from 'sharp'
import { ArkToolkitError } from './errors.ts'

/** Probed image facts shared by result reporting and artifact descriptors. */
export interface ProbedImage {
  width: number
  height: number
  format: 'png' | 'jpeg' | 'gif' | 'webp'
  mode: string
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
