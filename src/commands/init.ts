import { Command } from 'commander'
import { writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { existsSync } from 'fs'
import acceptanceReviewer from '../assets/agents/acceptance-reviewer.md'
import codeReviewer from '../assets/agents/code-reviewer.md'
import implementer from '../assets/agents/implementer.md'
import planner from '../assets/agents/planner.md'
import research from '../assets/agents/research.md'
import reflectSkill from '../assets/skills/reflect/SKILL.md'

const AGENTS: Record<string, string> = {
  'acceptance-reviewer.md': acceptanceReviewer,
  'code-reviewer.md': codeReviewer,
  'implementer.md': implementer,
  'planner.md': planner,
  'research.md': research,
}

// Keys are relative paths within .claude/skills/
const SKILLS: Record<string, string> = {
  'reflect/SKILL.md': reflectSkill,
}

export function initCommand(): Command {
  return new Command('init')
    .description('Install spec-driven development setup into the current project')
    .action(async () => {
      const cwd = process.cwd()

      console.log('Initializing kiss-spec in', cwd)

      await installFiles(cwd, join('.opencode', 'agents'), AGENTS)
      await installFiles(cwd, join('.claude', 'skills'), SKILLS)

      console.log('Done. Run `kiss-spec story create` to start your first story.')
    })
}

async function installFiles(cwd: string, subdir: string, files: Record<string, string>) {
  for (const [relPath, content] of Object.entries(files)) {
    const dest = join(cwd, subdir, relPath)
    if (existsSync(dest)) {
      console.log(`  skip  ${subdir}/${relPath} (already exists)`)
      continue
    }
    await mkdir(dirname(dest), { recursive: true })
    await writeFile(dest, content, 'utf8')
    console.log(`  write ${subdir}/${relPath}`)
  }
}
