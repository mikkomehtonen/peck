import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { run, makeTmpDir, removeTmpDir } from './helpers.js'

describe('kiss init', () => {
  let tmpDir: string

  beforeEach(async () => { tmpDir = await makeTmpDir() })
  afterEach(async () => { await removeTmpDir(tmpDir) })

  it('exits 0 and prints a done message', async () => {
    const { exitCode, stdout } = await run(['init'], tmpDir)
    expect(exitCode).toBe(0)
    expect(stdout).toMatch(/Done/)
  })

  it('creates the planner agent file', async () => {
    await run(['init'], tmpDir)
    const dest = join(tmpDir, '.opencode', 'agents', 'planner.md')
    await expect(access(dest)).resolves.toBeUndefined()
    const content = await readFile(dest, 'utf8')
    expect(content).toMatch(/Planner Agent/)
  })

  it('creates the spec-review skill file', async () => {
    await run(['init'], tmpDir)
    const dest = join(tmpDir, '.claude', 'skills', 'spec-review.md')
    await expect(access(dest)).resolves.toBeUndefined()
    const content = await readFile(dest, 'utf8')
    expect(content).toMatch(/Spec Review/)
  })

  it('skips existing files without overwriting', async () => {
    await run(['init'], tmpDir)
    const dest = join(tmpDir, '.opencode', 'agents', 'planner.md')
    // Overwrite with sentinel
    const { writeFile } = await import('node:fs/promises')
    await writeFile(dest, 'SENTINEL', 'utf8')

    const { stdout } = await run(['init'], tmpDir)
    expect(stdout).toMatch(/skip/)
    const content = await readFile(dest, 'utf8')
    expect(content).toBe('SENTINEL')
  })
})
