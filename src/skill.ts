/**
 * DSH-native adapter for the ark-skills Skill.
 * @module dsh-ark-toolkit/skill
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { SkillRegistration } from '@deepseek-ai/dsh-skill'

/** Stable catalog/invocation name shared with progressive tool exposure. */
export const ARK_SKILLS_NAME = 'ark-skills'

/** Packaged resource root for the adapted upstream playbooks. */
export const ARK_SKILLS_RESOURCE_BASE = fileURLToPath(
  new URL('../assets/skill/', import.meta.url),
)

/** Exact bundled instructions used as the progressive-exposure evidence marker. */
export const ARK_SKILLS_CONTENT = readFileSync(
  new URL('../assets/skill/SKILL.md', import.meta.url),
  'utf8',
)

/** Runtime skill registration mounted only after every native tool is ready. */
export const ARK_SKILLS_SKILL: SkillRegistration = {
  name: ARK_SKILLS_NAME,
  description: '用豆包 Seedream 生成图片（文生图），以及用豆包语音合成（TTS）把文本读成语音。当任务需要生成图片、绘制插画/图标，或需要把文字转成可播放的音频时使用。',
  whenToUse: '任务需要文生图（生成图片、插画、图标）或语音合成（把文本变成音频）时使用。',
  source: 'runtime',
  resourceBase: {
    kind: 'directory',
    path: ARK_SKILLS_RESOURCE_BASE,
  },
  content: ARK_SKILLS_CONTENT,
}
