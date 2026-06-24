import { Command } from 'commander'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import { getRepoRoot, detectDefaultBranch } from '../lib/git.js'
import { configPath, writeConfig } from '../lib/config.js'
import { AGENTS, SKILLS, AGENTS_DIR, SKILLS_DIR, installFiles } from '../lib/assets.js'
import pkg from '../../package.json'

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

      console.log('Initializing peck in', repoRoot)

      await installFiles(repoRoot, AGENTS_DIR, AGENTS, 'init')
      await installFiles(repoRoot, SKILLS_DIR, SKILLS, 'init')
      await initOpencodeJsonc(repoRoot)
      await initConfig(repoRoot)

      console.log('Done.')
    })
}

async function initConfig(repoRoot: string): Promise<void> {
  const path = configPath(repoRoot)
  if (existsSync(path)) {
    console.log('  skip  .opencode/peck.json (already exists)')
    return
  }
  const defaultBranch = await detectDefaultBranch(repoRoot)
  await writeConfig(repoRoot, { version: pkg.version, default_branch: defaultBranch })
  console.log(`  write .opencode/peck.json (default_branch: ${defaultBranch})`)
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
