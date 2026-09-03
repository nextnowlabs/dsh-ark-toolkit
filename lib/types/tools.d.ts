/**
 * Model-facing native tools. Every definition projects one structured runtime
 * operation and preserves canonical result metadata for the optional Web client
 * without changing Headless or model-visible semantics.
 * @module dsh-ark-toolkit/tools
 */
import { defineTool } from '@deepseek-ai/dsh-tools';
import type { JsonValue } from '@deepseek-ai/dsh-util-values';
import { ArkToolkitRuntime } from './runtime.ts';
/** Canonical names shared by registration, bootstrap guidance, and tests. */
export declare const ARK_TOOL_NAMES: {
    readonly glance: "ark_glance";
    readonly generateImage: "ark_generate_image";
    readonly speak: "ark_speak";
};
/** Runtime lookup accepted by tools so Settings can atomically swap generations. */
export type ArkToolkitRuntimeSource = ArkToolkitRuntime | (() => ArkToolkitRuntime);
/** Browser-only metadata projector; the model-visible value remains unchanged. */
export type ArkToolkitPresentationProjector = (value: JsonValue) => JsonValue;
/**
 * Build the complete tool set from one live runtime source.
 * @param source - Current runtime or atomic runtime lookup.
 * @param projectPresentation - Browser-only projection for Artifact capabilities.
 * @param lifecycleSignal - Plugin lifetime; aborting it cancels every active tool call.
 * @returns Native tool definitions registered as one lifecycle generation.
 */
export declare function createArkTools(source: ArkToolkitRuntimeSource, projectPresentation?: ArkToolkitPresentationProjector, lifecycleSignal?: AbortSignal): ReturnType<typeof defineTool>[];
//# sourceMappingURL=tools.d.ts.map