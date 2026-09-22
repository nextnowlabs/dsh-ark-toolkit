/**
 * @nextnowlabs/dsh-ark-toolkit — DSH Ark Toolkit profile bundle.
 *
 * Plugin lifecycle follows the documented readiness chain: publish the
 * ark-skills Skill and its one-shot bootstrap, then mount the execution
 * tools only in Agents that load that Skill or invoke the bootstrap. Any
 * failure leaves no model capability behind, and disposal unregisters every
 * global and Agent-scoped contribution the plugin mounted.
 *
 * Configuration follows the DSH `0.1.7` model: the plugin's Loader entry is
 * its settings section, every Config field is a live reference, and a
 * committed write updates those references in place. The plugin therefore
 * rebuilds its runtime from the committed values instead of waiting for a
 * remount that never comes.
 * @module @nextnowlabs/dsh-ark-toolkit
 */
import type { Context } from '@deepseek-ai/cordis';
import { Config, type ArkToolkitConfigRefs } from './config.ts';
export declare const name = "@nextnowlabs/dsh-ark-toolkit";
export { Config };
export declare const inject: string[];
/** Plugin entry: validate configuration synchronously, then mount asynchronously. */
export declare function apply(ctx: Context, config: ArkToolkitConfigRefs): Promise<() => void>;
//# sourceMappingURL=index.d.ts.map