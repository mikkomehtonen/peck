import { Command } from 'commander'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { getRepoRoot, git } from '../lib/git.js'
import { readConfig } from '../lib/config.js'
import storyTemplate from '../assets/templates/story.md'
import productTemplate from '../assets/templates/product.md'

export function storyCommand(): Command {
  const story = new Command('story').description('Manage stories')

  story
    .command('create <name>')
    .description('Scaffold a new story, create a git branch, output JSON for the planner agent')
    .action(async (name: string) => {
      const cwd = process.cwd()
      const repoRoot = await getRepoRoot(cwd)
      const config = await readConfig(repoRoot)
      const storiesDir = join(repoRoot, 'stories')

      // Sync with remote then reset to latest default branch
      try {
        await git(['fetch', '--all', '--prune'], repoRoot)
      } catch {
        // non-fatal — offline or no remotes
      }
      await git(['checkout', config.default_branch], repoRoot)
      try {
        await git(['pull', '--ff-only'], repoRoot)
      } catch {
        // non-fatal — no upstream set
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
    .action(() => {
      const storiesDir = join(process.cwd(), 'stories')
      if (!existsSync(storiesDir)) {
        console.log('No stories yet. Run `kiss-spec story create <name>` to create one.')
        return
      }
      const entries = readdirSync(storiesDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name))

      if (entries.length === 0) {
        console.log('No stories yet. Run `kiss-spec story create <name>` to create one.')
        return
      }

      for (const entry of entries) {
        const match = entry.name.match(/^(\d+)-(.+)$/)
        if (match) {
          console.log(`  ${match[1]}  ${match[2]}`)
        } else {
          console.log(`  ${entry.name}`)
        }
      }
    })

  story
    .command('load <slug>')
    .description('Print a story to stdout (pipe into your AI tool)')
    .action(async (slug: string) => {
      const storiesDir = join(process.cwd(), 'stories')
      const storyFile = findStory(storiesDir, slug)

      if (!storyFile) {
        process.stderr.write(`Story not found: ${slug}\n`)
        process.exit(1)
      }

      process.stdout.write(await readFile(storyFile, 'utf8'))
    })

  return story
}

async function nextFeatureNumber(storiesDir: string, repoRoot: string): Promise<number> {
  const fromDirs = highestFromDirs(storiesDir)
  const fromBranches = await highestFromBranches(repoRoot)
  return Math.max(fromDirs, fromBranches) + 1
}

function highestFromDirs(storiesDir: string): number {
  if (!existsSync(storiesDir)) return 0
  let highest = 0
  for (const entry of readdirSync(storiesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const match = entry.name.match(/^(\d+)/)
    if (match) highest = Math.max(highest, parseInt(match[1], 10))
  }
  return highest
}

async function highestFromBranches(repoRoot: string): Promise<number> {
  try {
    const output = await git(['branch', '-a'], repoRoot)
    let highest = 0
    for (const line of output.split('\n')) {
      const clean = line.replace(/^[* ]*/, '').replace(/^remotes\/[^/]*\//, '')
      const match = clean.match(/^(\d{3})-/)
      if (match) highest = Math.max(highest, parseInt(match[1], 10))
    }
    return highest
  } catch {
    return 0
  }
}

function findStory(storiesDir: string, slug: string): string | null {
  if (!existsSync(storiesDir)) return null
  for (const entry of readdirSync(storiesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (entry.name === slug || entry.name.endsWith(`-${slug}`) || entry.name.includes(slug)) {
      const candidate = join(storiesDir, entry.name, 'story.md')
      if (existsSync(candidate)) return candidate
    }
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
