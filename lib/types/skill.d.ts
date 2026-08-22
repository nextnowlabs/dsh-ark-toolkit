/**
 * DSH-native adapter for the ark-skills Skill.
 * @module dsh-ark-toolkit/skill
 */
import type { SkillRegistration } from '@deepseek-ai/dsh-skill';
/** Stable catalog/invocation name shared with progressive tool exposure. */
export declare const ARK_SKILLS_NAME = "ark-skills";
/** Packaged resource root for the adapted upstream playbooks. */
export declare const ARK_SKILLS_RESOURCE_BASE: string;
/** Exact bundled instructions used as the progressive-exposure evidence marker. */
export declare const ARK_SKILLS_CONTENT: string;
/** Runtime skill registration mounted only after every native tool is ready. */
export declare const ARK_SKILLS_SKILL: SkillRegistration;
//# sourceMappingURL=skill.d.ts.map