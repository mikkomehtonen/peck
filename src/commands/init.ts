import { Command } from 'commander'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import { getRepoRoot, detectDefaultBranch } from '../lib/git.js'
import { configPath, writeConfig } from '../lib/config.js'
import pkg from '../../package.json'
import acceptanceReviewer from '../assets/agents/acceptance-reviewer.md'
import codeReviewer from '../assets/agents/code-reviewer.md'
import implementer from '../assets/agents/implementer.md'
import planner from '../assets/agents/planner.md'
import reflectSkill from '../assets/skills/reflect/SKILL.md'

const AGENTS: Record<string, string> = {
  'acceptance-reviewer.md': acceptanceReviewer,
  'code-reviewer.md': codeReviewer,
  'implementer.md': implementer,
  'planner.md': planner,
}

const SKILLS: Record<string, string> = {
  'reflect/SKILL.md': reflectSkill,
}

const OPENCODE_JSONC = `{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-subagent-completion-hook"
  ],
  "agent": {
    "plan": { "disable": true },
    "build": { "disable": true }
  }
}
`

export function initCommand(): Command {
  return new Command('init')
    .description('Install spec-driven development setup into the current project')
    .action(async () => {
      const repoRoot = await getRepoRoot(process.cwd())

      console.log('Initializing kiss-spec in', repoRoot)

      await installFiles(repoRoot, join('.opencode', 'agents'), AGENTS)
      await installFiles(repoRoot, join('.opencode', 'skills'), SKILLS)
      await initOpencodeJsonc(repoRoot)
      await initConfig(repoRoot)

      console.log('Done.')
    })
}

async function initConfig(repoRoot: string): Promise<void> {
  const path = configPath(repoRoot)
  if (existsSync(path)) {
    console.log('  skip  .opencode/kiss-spec.json (already exists)')
    return
  }
  const defaultBranch = await detectDefaultBranch(repoRoot)
  await writeConfig(repoRoot, { version: pkg.version, default_branch: defaultBranch })
  console.log(`  write .opencode/kiss-spec.json (default_branch: ${defaultBranch})`)
}

async function initOpencodeJsonc(repoRoot: string): Promise<void> {
  const dest = join(repoRoot, '.opencode', 'opencode.jsonc')
  if (existsSync(dest)) {
    console.log('  skip  .opencode/opencode.jsonc (already exists)')
    return
  }
  await mkdir(dirname(dest), { recursive: true })
  await writeFile(dest, OPENCODE_JSONC, 'utf8')
  console.log('  write .opencode/opencode.jsonc')
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
