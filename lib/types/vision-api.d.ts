/**
 * Pure-TypeScript vision service client. Image understanding (vision_glance)
 * sends prepared data-URL image parts to the configured OpenAI-compatible
 * `/chat/completions` (or Anthropic `/v1/messages`) endpoint directly from
 * Node — no Python runtime is involved. Credentials never leave the plugin.
 * @module dsh-ark-toolkit/vision-api
 */
/** Fully resolved remote vision service configuration (no secrets logged). */
export interface VisionServiceOptions {
    baseUrl: string;
    apiKey: string;
    model: string;
    protocol: 'openai' | 'anthropic';
    userAgent: string;
    language: 'zh' | 'en';
    signal: AbortSignal;
}
/**
 * Build the user prompt for one glance call, mirroring the upstream CLI:
 * OCR, targeted query, multi-image comparison, or a default description.
 * @param query - optional targeted question.
 * @param ocr - transcribe visible text verbatim when true.
 * @param imageCount - number of images sent in this call.
 */
export declare function buildGlancePrompt(query: string | undefined, ocr: boolean, imageCount: number): string;
/**
 * Send prepared image data URLs to the configured vision model and return the
 * assistant text. Supports OpenAI Chat Completions and Anthropic Messages.
 * @param dataUrls - base64 data URLs (or http(s) image URLs) for one call.
 * @param prompt - user prompt (language instruction is prepended here).
 * @param options - resolved service configuration.
 * @returns the model's text answer.
 */
export declare function describeImages(dataUrls: readonly string[], prompt: string, options: VisionServiceOptions): Promise<DescribeImagesResult>;
/** Return shape enriched with timing for operation metrics. */
export interface DescribeImagesResult {
    text: string;
    upstreamMs: number;
}
//# sourceMappingURL=vision-api.d.ts.map