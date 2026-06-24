import { Command } from 'commander'
import { getRepoRoot } from '../lib/git.js'
import { readConfig, writeConfig } from '../lib/config.js'
import { AGENTS, SKILLS, AGENTS_DIR, SKILLS_DIR, installFiles } from '../lib/assets.js'
import pkg from '../../package.json'

export function updateCommand(): Command {
  return new Command('update')
    .description('Update peck agents and skills to the latest bundled versions')
    .action(async () => {
      const repoRoot = await getRepoRoot(process.cwd())
      const config = await readConfig(repoRoot)

      console.log('Updating peck in', repoRoot)

      await installFiles(repoRoot, AGENTS_DIR, AGENTS, 'update')
      await installFiles(repoRoot, SKILLS_DIR, SKILLS, 'update')

      await writeConfig(repoRoot, {
        version: pkg.version,
        default_branch: config.default_branch,
      })
      console.log(`  update .opencode/peck.json (version: ${pkg.version})`)

      console.log('Done.')
    })
}
