/**
 * Ark Toolkit runtime: structured requests in, structured results out.
 * ByteDance Seedream image generation and Volcengine TTS synthesis stay direct
 * HTTP. There is no Python runtime and no vendored pixel toolkit: the generated
 * image probe runs on sharp inside Node.
 * @module dsh-ark-toolkit/runtime
 */
import { randomUUID } from 'node:crypto';
import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describeArtifact } from "./artifacts.js";
import { resolveSeedreamModel, VOLCENGINE_TTS_VOICE } from "./config.js";
import { ArkToolkitError } from "./errors.js";
import { probeImage } from "./image-codec.js";
import { commitStagedOutput, createPathPolicy, createStagedOutput, resolveOutputFile, } from "./paths.js";
import { PLUGIN_VERSION } from "./version.js";
/** Combine a caller abort signal with one hard operation timeout. */
export function createDeadline(signal, timeoutMs) {
    const controller = new AbortController();
    const state = { timedOut: false, cancelled: false };
    const onCallerAbort = () => {
        if (controller.signal.aborted)
            return;
        state.cancelled = true;
        controller.abort();
    };
    if (signal.aborted) {
        state.cancelled = true;
        controller.abort();
    }
    else {
        signal.addEventListener('abort', onCallerAbort, { once: true });
    }
    const timer = setTimeout(() => {
        if (controller.signal.aborted)
            return;
        state.timedOut = true;
        controller.abort();
    }, timeoutMs);
    return {
        signal: controller.signal,
        get timedOut() { return state.timedOut; },
        get cancelled() { return state.cancelled; },
        cleanup() {
            clearTimeout(timer);
            signal.removeEventListener('abort', onCallerAbort);
        },
    };
}
/** FIFO bounded concurrency gate whose queued callers remain cancellable. */
export class Semaphore {
    limit;
    active = 0;
    waiters = [];
    constructor(limit) {
        this.limit = limit;
    }
    /** Whether no active or queued caller still owns this gate. */
    get idle() {
        return this.active === 0 && this.waiters.length === 0;
    }
    /** Acquire one slot, aborting while queued when `signal` fires. */
    async acquire(signal, permits = 1) {
        if (signal.aborted)
            throw new ArkToolkitError('cancelled', 'ark-toolkit: cancelled before execution');
        if (!Number.isInteger(permits) || permits < 1 || permits > this.limit) {
            throw new ArkToolkitError('input', `concurrency permits must be between 1 and ${this.limit}`);
        }
        if (this.waiters.length === 0 && this.active + permits <= this.limit) {
            this.active += permits;
            return;
        }
        return new Promise((resolveAcquire, reject) => {
            const entry = {
                resolve: resolveAcquire,
                reject,
                signal,
                permits,
                onAbort: () => { },
            };
            entry.onAbort = () => {
                const index = this.waiters.indexOf(entry);
                if (index >= 0)
                    this.waiters.splice(index, 1);
                reject(new ArkToolkitError('cancelled', 'ark-toolkit: cancelled while waiting for a concurrency slot'));
            };
            this.waiters.push(entry);
            signal.addEventListener('abort', entry.onAbort, { once: true });
        });
    }
    /** Release owned permits and wake FIFO waiters whose full weight now fits. */
    release(permits = 1) {
        this.active = Math.max(0, this.active - permits);
        while (this.waiters.length > 0) {
            const next = this.waiters[0];
            if (next === undefined || this.active + next.permits > this.limit)
                break;
            this.waiters.shift();
            next.signal.removeEventListener('abort', next.onAbort);
            this.active += next.permits;
            next.resolve();
        }
    }
}
/** Audio payload family used by clients to select a safe renderer. */
const SPEAK_MIME_TYPES = {
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    ogg_opus: 'audio/ogg',
    pcm: 'audio/pcm',
    wav: 'audio/wav',
};
/** Maximum assembled TTS audio bytes accepted per call. */
const MAX_SPEECH_BYTES = 64 * 1024 * 1024;
const MAX_TIMEOUT_MS = 600_000;
/** Runtime facade used by every native tool. */
export class ArkToolkitRuntime {
    ctx;
    config;
    semaphores = new Map();
    constructor(ctx, config) {
        this.ctx = ctx;
        this.config = config;
    }
    /** Stable runtime identity reported to tools and logs. */
    get runtimeInfo() {
        return { pluginVersion: PLUGIN_VERSION, runtime: 'pure-node' };
    }
    timeout(options) {
        const value = options.timeoutMs ?? this.config.timeoutMs;
        if (!Number.isInteger(value) || value < 1000 || value > MAX_TIMEOUT_MS) {
            throw new ArkToolkitError('input', `timeoutMs must be an integer between 1000 and ${MAX_TIMEOUT_MS}`);
        }
        return value;
    }
    operationError(tool, error, deadline, phase = 'execution') {
        if (deadline.cancelled) {
            return new ArkToolkitError('cancelled', phase === 'queue' ? `${tool}: cancelled while waiting for a concurrency slot` : `${tool}: cancelled`);
        }
        if (deadline.timedOut) {
            return new ArkToolkitError('timeout', phase === 'queue' ? `${tool}: timed out while waiting for a concurrency slot` : `${tool}: timed out`);
        }
        if (error instanceof ArkToolkitError)
            return error;
        return new ArkToolkitError('runtime', `${tool}: execution failed`, { cause: error });
    }
    semaphore(options) {
        const key = options.sessionId ?? `workspace:${options.workspace}`;
        const value = this.semaphores.get(key) ?? new Semaphore(this.config.concurrency);
        this.semaphores.set(key, value);
        return { key, value };
    }
    async runOperation(tool, options, action, permits = 1) {
        const timeoutMs = this.timeout(options);
        const semaphore = this.semaphore(options);
        const metrics = { startedAt: Date.now(), queueMs: 0, upstreamMs: 0 };
        let acquired = false;
        const queueDeadline = createDeadline(options.signal, timeoutMs);
        try {
            await semaphore.value.acquire(queueDeadline.signal, permits);
            acquired = true;
            if (queueDeadline.signal.aborted)
                throw this.operationError(tool, undefined, queueDeadline, 'queue');
            metrics.queueMs = Date.now() - metrics.startedAt;
        }
        catch (error) {
            metrics.queueMs = Date.now() - metrics.startedAt;
            const classified = this.operationError(tool, error, queueDeadline, 'queue');
            if (acquired) {
                semaphore.value.release(permits);
                acquired = false;
            }
            this.ctx.logger.warn('dsh-ark-toolkit tool=%s outcome=error category=%s totalMs=%d queueMs=%d upstreamMs=%d', tool, classified.code, Date.now() - metrics.startedAt, metrics.queueMs, metrics.upstreamMs);
            throw classified;
        }
        finally {
            queueDeadline.cleanup();
            if (!acquired && semaphore.value.idle)
                this.semaphores.delete(semaphore.key);
        }
        const executionDeadline = createDeadline(options.signal, timeoutMs);
        try {
            if (executionDeadline.signal.aborted)
                throw this.operationError(tool, undefined, executionDeadline);
            const value = await action({ signal: executionDeadline.signal, metrics });
            if (executionDeadline.signal.aborted)
                throw this.operationError(tool, undefined, executionDeadline);
            this.ctx.logger.info('dsh-ark-toolkit tool=%s outcome=ok totalMs=%d queueMs=%d upstreamMs=%d', tool, Date.now() - metrics.startedAt, metrics.queueMs, metrics.upstreamMs);
            return value;
        }
        catch (error) {
            const classified = this.operationError(tool, error, executionDeadline);
            this.ctx.logger.warn('dsh-ark-toolkit tool=%s outcome=error category=%s totalMs=%d queueMs=%d upstreamMs=%d', tool, classified.code, Date.now() - metrics.startedAt, metrics.queueMs, metrics.upstreamMs);
            throw classified;
        }
        finally {
            if (acquired)
                semaphore.value.release(permits);
            executionDeadline.cleanup();
            if (semaphore.value.idle)
                this.semaphores.delete(semaphore.key);
        }
    }
    /** Resolve the Ark credential, failing loud when it is not configured. */
    async arkCredential() {
        const resolved = await this.ctx.credentials.resolve(this.config.provider.credential);
        if (resolved === undefined) {
            throw new ArkToolkitError('config', `credential ${this.config.provider.credential} is not configured; set it through DSH credentials`);
        }
        return resolved;
    }
    pathPolicy(workspace) {
        return createPathPolicy(workspace, []);
    }
    async writableDirectoryCheck(path, label) {
        const probe = join(path, `.ark-toolkit-health-${randomUUID()}`);
        try {
            await writeFile(probe, 'ok\n', { encoding: 'utf8', flag: 'wx' });
            await rm(probe, { force: true });
            return { status: 'ok', detail: `${label} is writable: ${path}` };
        }
        catch {
            await rm(probe, { force: true }).catch(() => { });
            return { status: 'error', detail: `${label} is not writable: ${path}` };
        }
    }
    /** generateImage: ByteDance Seedream text-to-image through Volcengine Ark. */
    async generateImage(request, options) {
        return this.runOperation('ark_generate_image', options, async (operation) => {
            const prompt = request.prompt.trim();
            if (prompt.length === 0)
                throw new ArkToolkitError('input', 'generate_image: prompt must not be empty');
            const model = resolveSeedreamModel(request.model ?? '');
            const size = request.size?.trim() || '2K';
            if (!/^(1K|2K|3K|4K)$/.test(size)) {
                throw new ArkToolkitError('input', 'generate_image: size must be 1K, 2K, 3K, or 4K');
            }
            let aspectRatio = request.aspectRatio?.trim();
            if (aspectRatio !== undefined && aspectRatio.length === 0)
                aspectRatio = undefined;
            const resolved = await this.arkCredential();
            const endpoint = `${this.config.provider.baseUrl}/images/generations`;
            const body = {
                model,
                prompt: request.negativePrompt !== undefined && request.negativePrompt.trim().length > 0
                    ? `${prompt}\n\n反向提示词: ${request.negativePrompt.trim()}`
                    : prompt,
                size,
                n: 1,
                watermark: false,
            };
            if (aspectRatio !== undefined) {
                body.extra_parameters = { aspect_ratio: aspectRatio };
            }
            const started = Date.now();
            let response;
            try {
                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${resolved.value}`,
                        'User-Agent': this.config.provider.userAgent,
                    },
                    body: JSON.stringify(body),
                    signal: operation.signal,
                });
            }
            catch (error) {
                if (operation.signal.aborted)
                    throw new ArkToolkitError('cancelled', 'ark_generate_image: cancelled');
                throw new ArkToolkitError('runtime', `generate_image: Ark request failed: ${error instanceof Error ? error.message : String(error)}`);
            }
            finally {
                operation.metrics.upstreamMs += Date.now() - started;
            }
            if (!response.ok) {
                let detail = `HTTP ${response.status}`;
                try {
                    const payload = await response.json();
                    if (payload.error?.message !== undefined)
                        detail += `: ${payload.error.message}`;
                    else if (payload.error?.code !== undefined)
                        detail += `: ${payload.error.code}`;
                }
                catch {
                    // Keep the status-only detail when the error body is not JSON.
                }
                throw new ArkToolkitError('runtime', `generate_image: Ark ${detail}`);
            }
            const payload = await response.json();
            const entries = (payload.data ?? []).filter(entry => typeof entry.url === 'string' || typeof entry.b64_json === 'string');
            if (entries.length === 0) {
                throw new ArkToolkitError('output', 'generate_image: Ark returned no images');
            }
            const policy = await this.pathPolicy(options.workspace);
            const results = [];
            for (let index = 0; index < entries.length; index += 1) {
                const entry = entries[index];
                const staged = createStagedOutput(policy, '.png');
                try {
                    if (entry.b64_json !== undefined) {
                        await writeFile(staged, Buffer.from(entry.b64_json, 'base64'));
                    }
                    else {
                        const imageResponse = await fetch(entry.url, { signal: operation.signal });
                        if (!imageResponse.ok || imageResponse.body === null) {
                            throw new ArkToolkitError('runtime', `generate_image: failed to download generated image (HTTP ${imageResponse.status})`);
                        }
                        await writeFile(staged, Buffer.from(await imageResponse.arrayBuffer()));
                    }
                    const probed = await probeImage(staged);
                    const extension = `.${probed.format === 'jpeg' ? 'jpg' : probed.format}`;
                    const finalPath = resolveOutputFile(index === 0 ? request.output : undefined, policy, `seedream-${index + 1}${extension}`, ['.png', '.jpg', '.jpeg']);
                    await commitStagedOutput(staged, finalPath, policy);
                    const artifact = await describeArtifact(finalPath, policy, {
                        mimeType: probed.format === 'jpeg' ? 'image/jpeg' : 'image/png',
                        kind: 'image',
                        description: index === 0 ? 'Seedream generated image' : `Seedream generated image ${index + 1}`,
                        sourceTool: 'ark_generate_image',
                        previewIntent: 'image',
                    });
                    results.push({ artifact, width: probed.width, height: probed.height, format: probed.format });
                }
                finally {
                    await rm(staged, { force: true }).catch(() => { });
                }
            }
            return { prompt, model, images: results };
        });
    }
    /** speak: ByteDance TTS V3 speech synthesis through Volcengine Speech. */
    async speak(request, options) {
        return this.runOperation('ark_speak', options, async (operation) => {
            const text = request.text.trim();
            if (text.length === 0)
                throw new ArkToolkitError('input', 'speak: text must not be empty');
            if (text.length > 2000)
                throw new ArkToolkitError('input', 'speak: text must not exceed 2000 characters');
            const voiceType = request.voiceType?.trim() || VOLCENGINE_TTS_VOICE;
            const encoding = request.encoding?.trim() || 'mp3';
            if (!/^(mp3|ogg_opus|pcm|wav)$/.test(encoding)) {
                throw new ArkToolkitError('input', 'speak: encoding must be mp3, ogg_opus, pcm, or wav');
            }
            const rate = request.rate ?? 24000;
            const speed = request.speed ?? 1.0;
            const volume = request.volume ?? 1.0;
            const pitch = request.pitch ?? 0;
            for (const [name, value, min, max] of [
                ['rate', rate, 8000, 48000],
                ['speed', speed, 0.1, 3.0],
                ['volume', volume, 0.1, 3.0],
                ['pitch', pitch, -12, 12],
            ]) {
                if (typeof value !== 'number' || Number.isNaN(value) || value < min || value > max) {
                    throw new ArkToolkitError('input', `speak: ${name} must be a number between ${min} and ${max}`);
                }
            }
            const emotion = request.emotion?.trim();
            if (emotion !== undefined && emotion.length > 0 && !/^(happy|sad|neutral)$/.test(emotion)) {
                throw new ArkToolkitError('input', 'speak: emotion must be happy, sad, or neutral');
            }
            const emotionScale = request.emotionScale ?? 4;
            if (!Number.isInteger(emotionScale) || emotionScale < 1 || emotionScale > 5) {
                throw new ArkToolkitError('input', 'speak: emotionScale must be an integer between 1 and 5');
            }
            const language = request.language?.trim();
            const tts = this.config.provider.tts;
            const resolved = await this.ctx.credentials.resolve(tts.credential);
            if (resolved === undefined) {
                throw new ArkToolkitError('config', `credential ${tts.credential} is not configured; set the Volcengine TTS key through DSH credentials`);
            }
            // 新版控制台 API Key 方案：V3 请求使用 req_params body + X-Api-Resource-Id 头
            const audioParams = {
                format: encoding,
                // V3 使用整数倍率：-50 = 0.5x，0 = 1x，100 = 2x
                speech_rate: Math.max(-50, Math.min(100, Math.round((speed - 1) * 100))),
                loudness_rate: Math.max(-50, Math.min(100, Math.round((volume - 1) * 100))),
            };
            if (encoding === 'mp3' || encoding === 'ogg_opus')
                audioParams.bit_rate = 64000;
            const additions = {
                post_process: { pitch },
                disable_markdown_filter: true,
            };
            if (emotion !== undefined && emotion.length > 0) {
                additions.emotion = emotion;
                additions.emotion_scale = emotionScale;
            }
            if (language !== undefined && language.length > 0)
                additions.explicit_language = language;
            const body = {
                user: { uid: 'dsh-ark-toolkit-tts' },
                req_params: {
                    text,
                    speaker: voiceType,
                    sample_rate: rate,
                    audio_params: audioParams,
                    additions: JSON.stringify(additions),
                },
            };
            const started = Date.now();
            let response;
            try {
                response = await fetch(tts.baseUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Api-Resource-Id': tts.resource,
                        'X-Api-Key': resolved.value,
                        'X-Api-Request-Id': randomUUID(),
                        'User-Agent': this.config.provider.userAgent,
                    },
                    body: JSON.stringify(body),
                    signal: operation.signal,
                });
            }
            catch (error) {
                if (operation.signal.aborted)
                    throw new ArkToolkitError('cancelled', 'ark_speak: cancelled');
                throw new ArkToolkitError('runtime', `speak: Volcengine TTS request failed: ${error instanceof Error ? error.message : String(error)}`);
            }
            finally {
                operation.metrics.upstreamMs += Date.now() - started;
            }
            if (!response.ok) {
                throw new ArkToolkitError('runtime', `speak: Volcengine TTS HTTP ${response.status}`);
            }
            if (response.body === null)
                throw new ArkToolkitError('runtime', 'speak: Volcengine TTS returned no body');
            const chunks = [];
            let format = encoding;
            let sawAudio = false;
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            try {
                for (;;) {
                    if (operation.signal.aborted)
                        throw new ArkToolkitError('cancelled', 'ark_speak: cancelled');
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    buffer += decoder.decode(value, { stream: true });
                    let newlineIndex;
                    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                        const line = buffer.slice(0, newlineIndex).replace(/\r$/, '');
                        buffer = buffer.slice(newlineIndex + 1);
                        const trimmed = line.trim();
                        if (trimmed.length === 0 || trimmed.startsWith('event:'))
                            continue;
                        if (!trimmed.startsWith('data:'))
                            continue;
                        const data = trimmed.slice(5).trim();
                        if (data.length === 0 || data === '[DONE]')
                            continue;
                        let event;
                        try {
                            event = JSON.parse(data);
                        }
                        catch {
                            continue;
                        }
                        const code = typeof event.code === 'number' ? event.code : 0;
                        if (code !== 0 && code !== 20000000) {
                            throw new ArkToolkitError('runtime', `speak: Volcengine TTS ${typeof event.message === 'string' ? event.message : `code ${code}`}`);
                        }
                        if (typeof event.data === 'string' && event.data.length > 0) {
                            sawAudio = true;
                            chunks.push(Buffer.from(event.data, 'base64'));
                            let total = 0;
                            for (const chunk of chunks)
                                total += chunk.length;
                            if (total > MAX_SPEECH_BYTES)
                                throw new ArkToolkitError('capacity', 'speak: synthesized audio exceeds the 64 MiB limit');
                        }
                        if (typeof event.format === 'string')
                            format = event.format;
                    }
                }
            }
            finally {
                reader.releaseLock();
            }
            if (!sawAudio)
                throw new ArkToolkitError('output', 'speak: Volcengine TTS returned no audio');
            const extension = format === 'ogg_opus' ? 'ogg' : format;
            const policy = await this.pathPolicy(options.workspace);
            const staged = createStagedOutput(policy, `.${extension}`);
            try {
                await writeFile(staged, Buffer.concat(chunks));
                const finalPath = resolveOutputFile(request.output, policy, `speech-${Date.now().toString(36)}.${extension}`, ['.mp3', '.ogg', '.pcm', '.wav']);
                await commitStagedOutput(staged, finalPath, policy);
                const artifact = await describeArtifact(finalPath, policy, {
                    mimeType: SPEAK_MIME_TYPES[format] ?? 'application/octet-stream',
                    kind: 'audio',
                    description: 'ByteDance TTS speech',
                    sourceTool: 'ark_speak',
                    previewIntent: 'download',
                });
                return { text, voiceType, format, artifact };
            }
            finally {
                await rm(staged, { force: true }).catch(() => { });
            }
        });
    }
    /** Health: inspect local readiness and optionally probe the Ark `/models` endpoint. */
    async health(testConnection, options) {
        return this.runOperation('ark_toolkit_health', options, async (operation) => {
            let resolvedCredential;
            let credential;
            try {
                resolvedCredential = await this.ctx.credentials.resolve(this.config.provider.credential);
                credential = resolvedCredential === undefined
                    ? { status: 'error', detail: `credential ${this.config.provider.credential} is not configured` }
                    : { status: 'ok', detail: `credential ${this.config.provider.credential} is resolvable` };
            }
            catch {
                credential = { status: 'error', detail: `credential ${this.config.provider.credential} could not be resolved` };
            }
            let ttsCredential;
            try {
                const resolvedTts = await this.ctx.credentials.resolve(this.config.provider.tts.credential);
                ttsCredential = resolvedTts === undefined
                    ? { status: 'error', detail: `credential ${this.config.provider.tts.credential} is not configured` }
                    : { status: 'ok', detail: `credential ${this.config.provider.tts.credential} is resolvable` };
            }
            catch {
                ttsCredential = { status: 'error', detail: `credential ${this.config.provider.tts.credential} could not be resolved` };
            }
            let artifactDirectory;
            try {
                const policy = await createPathPolicy(options.workspace, []);
                artifactDirectory = await this.writableDirectoryCheck(policy.outputDir, 'Artifact directory');
            }
            catch {
                artifactDirectory = { status: 'error', detail: 'Artifact directory could not be prepared' };
            }
            let service = {
                status: 'not_tested',
                detail: 'Connection was not tested; pass testConnection=true to query the configured /models endpoint',
            };
            if (testConnection) {
                if (resolvedCredential === undefined) {
                    service = { status: 'error', detail: 'Connection test skipped because the configured credential is unavailable' };
                }
                else {
                    const endpoint = `${this.config.provider.baseUrl}/models`;
                    try {
                        const started = Date.now();
                        const response = await fetch(endpoint, {
                            method: 'GET',
                            headers: {
                                Accept: 'application/json',
                                Authorization: `Bearer ${resolvedCredential.value}`,
                                'User-Agent': this.config.provider.userAgent,
                            },
                            signal: operation.signal,
                        });
                        operation.metrics.upstreamMs += Date.now() - started;
                        await response.body?.cancel().catch(() => { });
                        if (response.ok) {
                            service = { status: 'ok', detail: `Service responded at ${endpoint} (HTTP ${response.status})` };
                        }
                        else if (response.status === 401) {
                            service = { status: 'error', detail: `Service rejected the configured credential (HTTP ${response.status})` };
                        }
                        else if (response.status === 403) {
                            service = { status: 'warning', detail: `Service is reachable but restricted GET /models (HTTP ${response.status}); the credential may still be valid for image generation` };
                        }
                        else if (response.status === 404 || response.status === 405) {
                            service = { status: 'warning', detail: `Service is reachable but does not expose GET /models (HTTP ${response.status})` };
                        }
                        else if (response.status === 429) {
                            service = { status: 'warning', detail: 'Service is reachable but rate-limited the connection test (HTTP 429)' };
                        }
                        else {
                            service = { status: 'error', detail: `Service connection test failed with HTTP ${response.status}` };
                        }
                    }
                    catch {
                        if (operation.signal.aborted)
                            throw new ArkToolkitError('cancelled', 'ark_toolkit_health: cancelled');
                        service = { status: 'error', detail: `Service could not be reached at ${endpoint}` };
                    }
                }
            }
            const checks = { credential, ttsCredential, artifactDirectory, service };
            const healthy = Object.values(checks).every(check => check.status !== 'error');
            return {
                pluginVersion: PLUGIN_VERSION,
                checks,
                healthy,
                connectionTested: testConnection,
            };
        });
    }
}
//# sourceMappingURL=runtime.js.map