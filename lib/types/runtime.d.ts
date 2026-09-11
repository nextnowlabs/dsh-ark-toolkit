/**
 * Ark Toolkit runtime: structured requests in, structured results out.
 * ByteDance Seedream image generation and Volcengine TTS synthesis stay direct
 * HTTP. There is no Python runtime and no vendored pixel toolkit: the generated
 * image probe runs on sharp inside Node.
 * @module dsh-ark-toolkit/runtime
 */
import type { Context } from '@deepseek-ai/cordis';
import { type ArtifactDescriptor } from './artifacts.ts';
import { type ResolvedArkToolkitConfig } from './config.ts';
/** Per-invocation cancellation and timeout facts. */
export interface Deadline {
    signal: AbortSignal;
    /** True when the deadline timer fired. */
    timedOut: boolean;
    /** True when the caller signal fired first. */
    cancelled: boolean;
    /** Clear the timer and caller listener. */
    cleanup(): void;
}
/** Combine a caller abort signal with one hard operation timeout. */
export declare function createDeadline(signal: AbortSignal, timeoutMs: number): Deadline;
/** FIFO bounded concurrency gate whose queued callers remain cancellable. */
export declare class Semaphore {
    private readonly limit;
    private active;
    private readonly waiters;
    constructor(limit: number);
    /** Whether no active or queued caller still owns this gate. */
    get idle(): boolean;
    /** Acquire one slot, aborting while queued when `signal` fires. */
    acquire(signal: AbortSignal, permits?: number): Promise<void>;
    /** Release owned permits and wake FIFO waiters whose full weight now fits. */
    release(permits?: number): void;
}
/** Structured input for the ByteDance Seedream text-to-image tool. */
export interface GenerateImageRequest {
    /** Text prompt (Chinese/English both work with Seedream). */
    prompt: string;
    /** Model alias (seedream-5.0-pro/lite, seedream-4.5, seedream-4.0) or a full Ark model id. */
    model?: string;
    /** Resolution label: 1K/2K/3K/4K. */
    size?: string;
    /** Aspect ratio such as 16:9, 9:16, 4:3, 3:4, 21:9, or 1:1. */
    aspectRatio?: string;
    /** Negative prompt appended to the prompt. */
    negativePrompt?: string;
    /** Output artifact filename; .png/.jpg/.jpeg. */
    output?: string;
}
/** One generated Seedream image and its delivered artifact. */
export interface GenerateImageResult {
    prompt: string;
    model: string;
    images: Array<{
        artifact: ArtifactDescriptor;
        width: number;
        height: number;
        format: string;
    }>;
}
/** Structured input for the ByteDance speech-synthesis tool. */
export interface SpeakRequest {
    /** Text to synthesize. */
    text: string;
    /** Voice id from the official 在线音色列表 (e.g. zh_female_shuangkuaisisi_uranus_bigtts). */
    voiceType?: string;
    /** Audio format: mp3 (default), ogg_opus, pcm, or wav. */
    encoding?: string;
    /** Sample rate (default 24000). */
    rate?: number;
    /** Speed ratio 0.1-3.0 (default 1.0). */
    speed?: number;
    /** Volume ratio 0.1-3.0 (default 1.0). */
    volume?: number;
    /** Pitch shift in semitones -12 to 12 (default 0). */
    pitch?: number;
    /** Emotion: happy, sad, or neutral. */
    emotion?: string;
    /** Emotion intensity 1-5 (default 4). */
    emotionScale?: number;
    /** Language: zh-cn, en, or ja. */
    language?: string;
    /** Output artifact filename; .mp3/.ogg/.pcm/.wav. */
    output?: string;
}
/** One synthesized speech file delivered as an artifact. */
export interface SpeakResult {
    text: string;
    voiceType: string;
    format: string;
    artifact: ArtifactDescriptor;
}
/** One named health-check state. */
export interface HealthCheck {
    status: 'ok' | 'warning' | 'error' | 'not_tested';
    detail: string;
}
/** Runtime, credential, storage, and optional service health. */
export interface ArkToolkitHealthResult {
    pluginVersion: string;
    checks: {
        credential: HealthCheck;
        ttsCredential: HealthCheck;
        artifactDirectory: HealthCheck;
        service: HealthCheck;
    };
    healthy: boolean;
    connectionTested: boolean;
}
/** Shared per-call execution options. */
export interface ToolCallOptions {
    signal: AbortSignal;
    timeoutMs?: number;
    workspace: string;
    /** Session identity for the per-session concurrency cap. */
    sessionId?: string;
}
/** Runtime facade used by every native tool. */
export declare class ArkToolkitRuntime {
    private readonly ctx;
    private readonly config;
    private readonly semaphores;
    constructor(ctx: Context, config: ResolvedArkToolkitConfig);
    /** Stable runtime identity reported to tools and logs. */
    get runtimeInfo(): {
        pluginVersion: string;
        runtime: 'pure-node';
    };
    private timeout;
    private operationError;
    private semaphore;
    private runOperation;
    /** Resolve the Ark credential, failing loud when it is not configured. */
    private arkCredential;
    private pathPolicy;
    private writableDirectoryCheck;
    /** generateImage: ByteDance Seedream text-to-image through Volcengine Ark. */
    generateImage(request: GenerateImageRequest, options: ToolCallOptions): Promise<GenerateImageResult>;
    /** speak: ByteDance TTS V3 speech synthesis through Volcengine Speech. */
    speak(request: SpeakRequest, options: ToolCallOptions): Promise<SpeakResult>;
    /** Health: inspect local readiness and optionally probe the Ark `/models` endpoint. */
    health(testConnection: boolean, options: ToolCallOptions): Promise<ArkToolkitHealthResult>;
}
//# sourceMappingURL=runtime.d.ts.map