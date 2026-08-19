import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  VISION_SKILLS_CONTENT,
  VISION_SKILLS_RESOURCE_BASE,
  VISION_SKILLS_SKILL,
} from '../src/skill.ts'

describe('pure-Node vision-skills Skill', () => {
  it('loads the packaged Markdown and exposes its reference base', async () => {
    const bytes = await readFile(join(VISION_SKILLS_RESOURCE_BASE, 'SKILL.md'))
    expect(VISION_SKILLS_CONTENT).toBe(bytes.toString('utf8'))
    expect(VISION_SKILLS_SKILL.name).toBe('vision-skills')
    expect(VISION_SKILLS_SKILL.resourceBase).toEqual({
      kind: 'directory',
      path: VISION_SKILLS_RESOURCE_BASE,
    })
    await expect(stat(join(VISION_SKILLS_RESOURCE_BASE, 'SKILL.md'))).resolves.toBeDefined()
  })

  it('documents only the pure-Node tool set without Python or local pixel tools', () => {
    expect(VISION_SKILLS_CONTENT).toContain('vision_glance')
    expect(VISION_SKILLS_CONTENT).toContain('vision_generate_image')
    expect(VISION_SKILLS_CONTENT).toContain('vision_speak')
    expect(VISION_SKILLS_CONTENT).toContain('untrusted visual evidence')
    expect(VISION_SKILLS_CONTENT).not.toContain('vision_pixel_diff')
    expect(VISION_SKILLS_CONTENT).not.toContain('vision_ground')
    expect(VISION_SKILLS_CONTENT).not.toContain('python3')
    expect(VISION_SKILLS_CONTENT).not.toContain('Pillow')
  })
})
