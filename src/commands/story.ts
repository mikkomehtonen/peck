import { Command } from 'commander'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import storyTemplate from '../assets/templates/story.md'

export function storyCommand(): Command {
  const story = new Command('story').description('Manage stories')

  story
    .command('create <name>')
    .description('Scaffold a new story')
    .action(async (name: string) => {
      const slug = toSlug(name)
      const dir = join(process.cwd(), 'stories')
      await mkdir(dir, { recursive: true })

      const dest = join(dir, `${slug}.md`)
      if (existsSync(dest)) {
        console.error(`Story already exists: stories/${slug}.md`)
        process.exit(1)
      }

      const content = storyTemplate
        .replace(/{{name}}/g, name)
        .replace(/{{slug}}/g, slug)
        .replace(/{{date}}/g, new Date().toISOString().slice(0, 10))

      await writeFile(dest, content, 'utf8')
      console.log(`Created stories/${slug}.md`)
    })

  story
    .command('load <slug>')
    .description('Print a story to stdout (pipe into your AI tool)')
    .action(async (slug: string) => {
      const dest = join(process.cwd(), 'stories', `${slug}.md`)
      if (!existsSync(dest)) {
        console.error(`Story not found: stories/${slug}.md`)
        process.exit(1)
      }
      const content = await readFile(dest, 'utf8')
      process.stdout.write(content)
    })

  return story
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
