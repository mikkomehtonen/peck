import { Command } from 'commander'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import agentPlanner from '../assets/agents/planner.md'
import skillSpecReview from '../assets/skills/spec-review.md'

export function initCommand(): Command {
  return new Command('init')
    .description('Install spec-driven development setup into the current project')
    .action(async () => {
      const cwd = process.cwd()

      console.log('Initializing kiss-spec in', cwd)

      await installAgents(cwd)
      await installSkills(cwd)

      console.log('Done. Run `kiss story create` to start your first story.')
    })
}

async function installAgents(cwd: string) {
  const dir = join(cwd, '.opencode', 'agents')
  await mkdir(dir, { recursive: true })

  const agents: Record<string, string> = {
    'planner.md': agentPlanner,
  }

  for (const [filename, content] of Object.entries(agents)) {
    const dest = join(dir, filename)
    if (existsSync(dest)) {
      console.log(`  skip  ${filename} (already exists)`)
      continue
    }
    await writeFile(dest, content, 'utf8')
    console.log(`  write .opencode/agents/${filename}`)
  }
}

async function installSkills(cwd: string) {
  const dir = join(cwd, '.claude', 'skills')
  await mkdir(dir, { recursive: true })

  const skills: Record<string, string> = {
    'spec-review.md': skillSpecReview,
  }

  for (const [filename, content] of Object.entries(skills)) {
    const dest = join(dir, filename)
    if (existsSync(dest)) {
      console.log(`  skip  ${filename} (already exists)`)
      continue
    }
    await writeFile(dest, content, 'utf8')
    console.log(`  write .claude/skills/${filename}`)
  }
}
