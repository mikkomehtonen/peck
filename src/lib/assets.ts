import { writeFile, mkdir, copyFile, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import acceptanceReviewer from '../assets/agents/acceptance-reviewer.md'
import codeReviewer from '../assets/agents/code-reviewer.md'
import implementer from '../assets/agents/implementer.md'
import planner from '../assets/agents/planner.md'
import reflectSkill from '../assets/skills/reflect/SKILL.md'

export const AGENTS_DIR = join('.opencode', 'agents')
export const SKILLS_DIR = join('.opencode', 'skills')

export const AGENTS: Record<string, string> = {
  'acceptance-reviewer.md': acceptanceReviewer,
  'code-reviewer.md': codeReviewer,
  'implementer.md': implementer,
  'planner.md': planner,
}

export const SKILLS: Record<string, string> = {
  'reflect/SKILL.md': reflectSkill,
}

export type InstallMode = 'init' | 'update'

export async function installFiles(
  cwd: string,
  subdir: string,
  files: Record<string, string>,
  mode: InstallMode,
): Promise<void> {
  for (const [relPath, content] of Object.entries(files)) {
    const dest = join(cwd, subdir, relPath)
    const label = `${subdir}/${relPath}`

    if (!existsSync(dest)) {
      await mkdir(dirname(dest), { recursive: true })
      await writeFile(dest, content, 'utf8')
      console.log(`  write ${label}`)
      continue
    }

    if (mode === 'init') {
      console.log(`  skip  ${label} (already exists)`)
      continue
    }

    // update mode
    const existing = await readFileSafe(dest)
    if (existing === content) {
      console.log(`  skip  ${label} (up to date)`)
      continue
    }

    const bak = `${dest}.bak`
    await copyFile(dest, bak)
    await writeFile(dest, content, 'utf8')
    console.log(`  update ${label} (backed up to ${relPath}.bak)`)
  }
}

async function readFileSafe(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return ''
  }
}
