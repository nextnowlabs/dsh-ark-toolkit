/**
 * Volcengine Ark (ByteDance) backend defaults shared by server and browser
 * settings. The toolkit only talks to ByteDance: image understanding uses the
 * Doubao Seed Vision model over OpenAI-compatible `/chat/completions`, and the
 * Seedream tool generates images over `/images/generations`. Secrets never
 * live here — the API key is resolved from DSH Credentials by name.
 */
export declare const ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
/** DSH Credential reference that holds the user's Volcengine Ark API key. */
export declare const ARK_CREDENTIAL = "ARK_API_KEY";
/** Doubao Seed Vision: default image understanding model (`/chat/completions`). */
export declare const ARK_VISION_MODEL = "doubao-seed-2-0-lite-260215";
/** Doubao Seedream: default text-to-image model (`/images/generations`). */
export declare const ARK_SEEDREAM_MODEL = "doubao-seedream-5-0-260128";
/** Seedream aliases -> full Ark model ids, shared with the generate tool. */
export declare const SEEDREAM_MODEL_ALIASES: Record<string, string>;
//# sourceMappingURL=defaults.d.ts.map