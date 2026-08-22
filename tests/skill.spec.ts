import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ARK_SKILLS_CONTENT,
  ARK_SKILLS_RESOURCE_BASE,
  ARK_SKILLS_SKILL,
} from '../src/skill.ts'

describe('pure-Node ark-skills Skill', () => {
  it('loads the packaged Markdown and exposes its reference base', async () => {
    const bytes = await readFile(join(ARK_SKILLS_RESOURCE_BASE, 'SKILL.md'))
    expect(ARK_SKILLS_CONTENT).toBe(bytes.toString('utf8'))
    expect(ARK_SKILLS_SKILL.name).toBe('ark-skills')
    expect(ARK_SKILLS_SKILL.resourceBase).toEqual({
      kind: 'directory',
      path: ARK_SKILLS_RESOURCE_BASE,
    })
    await expect(stat(join(ARK_SKILLS_RESOURCE_BASE, 'SKILL.md'))).resolves.toBeDefined()
  })

  it('documents only the pure-Node tool set without Python or local pixel tools', () => {
    expect(ARK_SKILLS_CONTENT).toContain('ark_glance')
    expect(ARK_SKILLS_CONTENT).toContain('ark_generate_image')
    expect(ARK_SKILLS_CONTENT).toContain('ark_speak')
    expect(ARK_SKILLS_CONTENT).toContain('untrusted visual evidence')
    expect(ARK_SKILLS_CONTENT).not.toContain('vision_pixel_diff')
    expect(ARK_SKILLS_CONTENT).not.toContain('vision_ground')
    expect(ARK_SKILLS_CONTENT).not.toContain('python3')
    expect(ARK_SKILLS_CONTENT).not.toContain('Pillow')
  })
})
