import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import { fatal } from './fatal.js'

export interface PeckConfig {
  version: string
  default_branch: string
}

export function configPath(repoRoot: string): string {
  return join(repoRoot, '.opencode', 'peck.json')
}

export async function readConfig(repoRoot: string): Promise<PeckConfig> {
  const path = configPath(repoRoot)
  if (!existsSync(path)) fatal(`peck config not found at ${path}. Run \`peck init\` first.`)
  return JSON.parse(await readFile(path, 'utf8')) as PeckConfig
}

export async function writeConfig(repoRoot: string, config: PeckConfig): Promise<void> {
  const path = configPath(repoRoot)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(config, null, 2) + '\n', 'utf8')
}
