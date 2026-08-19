/**
 * Volcengine Ark (ByteDance) backend defaults shared by server and browser
 * settings. The toolkit only talks to ByteDance: image understanding uses the
 * Doubao Seed Vision model over OpenAI-compatible `/chat/completions`, and the
 * Seedream tool generates images over `/images/generations`. Secrets never
 * live here — the API key is resolved from DSH Credentials by name.
 */
export const ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
/** DSH Credential reference that holds the user's Volcengine Ark API key. */
export const ARK_CREDENTIAL = 'ARK_API_KEY'
/** Doubao Seed Vision: default image understanding model (`/chat/completions`). */
export const ARK_VISION_MODEL = 'doubao-seed-2-0-lite-260215'
/** Doubao Seedream: default text-to-image model (`/images/generations`). */
export const ARK_SEEDREAM_MODEL = 'doubao-seedream-5-0-260128'

/** Seedream aliases -> full Ark model ids, shared with the generate tool. */
export const SEEDREAM_MODEL_ALIASES: Record<string, string> = {
  'seedream-5.0-pro': 'doubao-seedream-5-0-pro-260628',
  'seedream-5.0-lite': 'doubao-seedream-5-0-260128',
  'seedream-4.5': 'doubao-seedream-4-5-251128',
  'seedream-4.0': 'doubao-seedream-4-0-250828',
}

/**
 * Volcengine Speech TTS V3 (ByteDance) endpoint used by the speak tool. This
 * is the standalone speech service (`openspeech.bytedance.com`), not the Ark
 * OpenAI-compatible route: it authenticates with a speech appid + token pair,
 * matching the bundled `volcengine_speech.py` reference.
 */
export const VOLCENGINE_TTS_URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse'
/** DSH Credential reference that holds the user's Volcengine TTS API key (token). */
export const VOLCENGINE_TTS_CREDENTIAL = 'VOLCENGINE_TTS_KEY'
/** TTS resource/app id; the 豆包语音合成模型2.0 app by default. */
export const VOLCENGINE_TTS_RESOURCE = 'seed-tts-2.0'
/** Default voice (爽快思思 2.0) from the official 在线音色列表. */
export const VOLCENGINE_TTS_VOICE = 'zh_female_shuangkuaisisi_uranus_bigtts'
