import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import { fatal } from './fatal.js'

export interface KissConfig {
  version: string
  default_branch: string
}

export function configPath(repoRoot: string): string {
  return join(repoRoot, '.opencode', 'kiss-spec.json')
}

export async function readConfig(repoRoot: string): Promise<KissConfig> {
  const path = configPath(repoRoot)
  if (!existsSync(path)) fatal(`kiss-spec config not found at ${path}. Run \`kiss-spec init\` first.`)
  return JSON.parse(await readFile(path, 'utf8')) as KissConfig
}

export async function writeConfig(repoRoot: string, config: KissConfig): Promise<void> {
  const path = configPath(repoRoot)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(config, null, 2) + '\n', 'utf8')
}
