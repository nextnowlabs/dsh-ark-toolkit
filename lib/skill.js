/**
 * DSH-native adapter for the vision-skills Skill.
 * @module dsh-vision-toolkit/skill
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
/** Stable catalog/invocation name shared with progressive tool exposure. */
export const VISION_SKILLS_NAME = 'vision-skills';
/** Packaged resource root for the adapted upstream playbooks. */
export const VISION_SKILLS_RESOURCE_BASE = fileURLToPath(new URL('../assets/skill/', import.meta.url));
/** Exact bundled instructions used as the progressive-exposure evidence marker. */
export const VISION_SKILLS_CONTENT = readFileSync(new URL('../assets/skill/SKILL.md', import.meta.url), 'utf8');
/** Runtime skill registration mounted only after every native tool is ready. */
export const VISION_SKILLS_SKILL = {
    name: VISION_SKILLS_NAME,
    description: '用大模型理解图片：看图问答（描述、回答针对图片的问题）、精确 OCR 转写可见文字、多图对比，以及调用豆包 Seedream 文生图和豆包语音合成（TTS）。当任务涉及图片理解、图片问答、截图/OCR 或根据图片内容作答时使用。',
    whenToUse: '任务需要理解图片内容（看图、问答、OCR）、基于截图回答问题或对比多张图片时使用。',
    source: 'runtime',
    resourceBase: {
        kind: 'directory',
        path: VISION_SKILLS_RESOURCE_BASE,
    },
    content: VISION_SKILLS_CONTENT,
};
//# sourceMappingURL=skill.js.map