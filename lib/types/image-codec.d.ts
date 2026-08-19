/**
 * Pure-Node image codec backed by sharp. Probe, crop, and lossless-first
 * compression replace the former vendored Pillow runtime — no Python involved.
 * @module dsh-ark-toolkit/image-codec
 */
/** Probed image facts shared by validation and artifacts. */
export interface ProbedImage {
    width: number;
    height: number;
    format: 'png' | 'jpeg' | 'gif' | 'webp';
    mode: string;
}
/** Result of one sharp compression pass for an oversized image. */
export interface CompressedImageInfo {
    bytes: number;
    width: number;
    height: number;
    format: 'png' | 'jpeg' | 'gif' | 'webp';
    lossy: boolean;
    resized: boolean;
}
/** Read image dimensions and format without decoding pixel data. */
export declare function probeImage(path: string): Promise<ProbedImage>;
/** Crop a pixel box and return it as a base64 PNG data URL (used for glance region). */
export declare function cropRegionToDataUrl(path: string, region: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}): Promise<string>;
/** Read a whole image and return it as a base64 data URL. */
export declare function imageToDataUrl(path: string): Promise<string>;
/**
 * Lossless-first compression ladder: try PNG then WebP-lossless re-encodes,
 * then WebP/JPEG quality reduction, and only downscale when none fit the
 * configured byte/pixel budget. Always writes exactly one file.
 * @returns facts about the written file.
 */
export declare function compressImage(sourcePath: string, destPath: string, maxBytes: number, maxPixels: number): Promise<CompressedImageInfo>;
//# sourceMappingURL=image-codec.d.ts.map