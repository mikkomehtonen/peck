import { Command } from 'commander'
import { writeFile, mkdir } from 'node:fs/promises'
import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Dirent } from 'node:fs'
import { getRepoRoot, git } from '../lib/git.js'
import { readConfig } from '../lib/config.js'
import { fatal } from '../lib/fatal.js'
import storyTemplate from '../assets/templates/story.md'
import productTemplate from '../assets/templates/product.md'

export function storyCommand(): Command {
  const story = new Command('story').description('Manage stories')

  story
    .command('create <name>')
    .description('Scaffold a new story, create a git branch, output JSON for the planner agent')
    .action(async (name: string) => {
      const repoRoot = await getRepoRoot(process.cwd())
      const config = await readConfig(repoRoot)
      const storiesDir = join(repoRoot, 'stories')

      try {
        await git(['fetch', '--all', '--prune'], repoRoot)
      } catch {
        // non-fatal — offline or no remotes
      }
      try {
        const currentBranch = await git(['symbolic-ref', '--short', 'HEAD'], repoRoot)
        if (currentBranch !== config.default_branch) {
          await git(['checkout', config.default_branch], repoRoot)
        }
      } catch {
        // fresh repo with no commits — already on the initial branch
      }
      try {
        await git(['pull', '--ff-only'], repoRoot)
      } catch {
        // non-fatal — no upstream set or empty repo
      }

      const num = await nextFeatureNumber(storiesDir, repoRoot)
      const featureNum = num.toString().padStart(3, '0')
      const branchName = truncateBranch(`${featureNum}-${toSlug(name)}`)

      await git(['checkout', '-b', branchName], repoRoot)

      const featureDir = join(storiesDir, branchName)
      await mkdir(featureDir, { recursive: true })

      const storyFile = join(featureDir, 'story.md')
      await writeFile(storyFile, storyTemplate, 'utf8')

      const productFile = join(repoRoot, 'docs', 'product.md')
      if (!existsSync(productFile)) {
        await mkdir(join(repoRoot, 'docs'), { recursive: true })
        await writeFile(productFile, productTemplate, 'utf8')
      }

      process.stdout.write(JSON.stringify({
        GIT_BRANCH_NAME: branchName,
        STORY_FILE: storyFile,
        PRODUCT_FILE: productFile,
      }) + '\n')
    })

  story
    .command('list')
    .description('List all stories')
    .action(async () => {
      const repoRoot = await getRepoRoot(process.cwd())
      const storiesDir = join(repoRoot, 'stories')
      const entries = storyDirs(storiesDir)

      if (entries.length === 0) {
        console.log('No stories yet. Run `peck story create <name>` to create one.')
        return
      }

      for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        const match = entry.name.match(/^(\d+)-(.+)$/)
        if (match) {
          console.log(`  ${match[1]}  ${match[2]}`)
        } else {
          console.log(`  ${entry.name}`)
        }
      }
    })

  story
    .command('load <id>')
    .description('Checkout the story branch and print paths to all files in the story directory')
    .action(async (id: string) => {
      const repoRoot = await getRepoRoot(process.cwd())
      const branchName = await findBranchById(repoRoot, id)

      if (!branchName) fatal(`Story not found: ${id}`)

      await git(['checkout', branchName], repoRoot)

      const storiesDir = join(repoRoot, 'stories')
      const storyDir = join(storiesDir, branchName)

      if (!existsSync(storyDir)) fatal(`Story directory not found after checkout: ${storyDir}`)

      const files = readdirSync(storyDir, { withFileTypes: true })
        .filter((e: Dirent) => e.isFile())
        .map((e: Dirent) => join(storyDir, e.name))

      process.stdout.write(JSON.stringify({ GIT_BRANCH_NAME: branchName, FILES: files }) + '\n')
    })

  return story
}

function storyDirs(storiesDir: string): Dirent[] {
  if (!existsSync(storiesDir)) return []
  return readdirSync(storiesDir, { withFileTypes: true }).filter(e => e.isDirectory())
}

async function nextFeatureNumber(storiesDir: string, repoRoot: string): Promise<number> {
  const fromDirs = Math.max(0, ...storyDirs(storiesDir).map(e => {
    const m = e.name.match(/^(\d+)/)
    return m ? parseInt(m[1], 10) : 0
  }))
  const fromBranches = await highestFromBranches(repoRoot)
  return Math.max(fromDirs, fromBranches) + 1
}

async function highestFromBranches(repoRoot: string): Promise<number> {
  try {
    const output = await git(['branch', '-a'], repoRoot)
    return Math.max(0, ...output.split('\n').map(line => {
      const clean = line.replace(/^[* ]*/, '').replace(/^remotes\/[^/]*\//, '')
      const m = clean.match(/^(\d{3})-/)
      return m ? parseInt(m[1], 10) : 0
    }))
  } catch {
    return 0
  }
}

async function findBranchById(repoRoot: string, id: string): Promise<string | null> {
  const num = id.replace(/^0+/, '') || '0'
  const output = await git(['branch', '-a'], repoRoot)
  for (const line of output.split('\n')) {
    const branch = line.replace(/^[* ]*/, '').replace(/^remotes\/[^/]*\//, '').trim()
    const m = branch.match(/^(\d+)-/)
    if (m && m[1].replace(/^0+/, '') === num) return branch
  }
  return null
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function truncateBranch(name: string, max = 244): string {
  if (name.length <= max) return name
  return name.substring(0, max).replace(/-$/, '')
}
