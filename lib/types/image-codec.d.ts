/**
 * Pure-Node image probe backed by sharp: read the dimensions and format of a
 * generated image without decoding pixel data. There is no Python runtime and
 * no vendored pixel toolkit involved.
 * @module dsh-ark-toolkit/image-codec
 */
/** Probed image facts shared by result reporting and artifact descriptors. */
export interface ProbedImage {
    width: number;
    height: number;
    format: 'png' | 'jpeg' | 'gif' | 'webp';
    mode: string;
}
/** Read image dimensions and format without decoding pixel data. */
export declare function probeImage(path: string): Promise<ProbedImage>;
//# sourceMappingURL=image-codec.d.ts.map