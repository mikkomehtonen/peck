import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFile, access, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { run, makeTmpDir, removeTmpDir } from './helpers.js'
import pkg from '../package.json'

const execFileAsync = promisify(execFile)

const VERSION = pkg.version

async function initGitRepo(dir: string, defaultBranch = 'main') {
  await execFileAsync('git', ['init', '-b', defaultBranch], { cwd: dir })
  await execFileAsync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
  await execFileAsync('git', ['config', 'user.name', 'Test'], { cwd: dir })
  await writeFile(join(dir, 'README.md'), '# test')
  await execFileAsync('git', ['add', '.'], { cwd: dir })
  await execFileAsync('git', ['commit', '--no-gpg-sign', '-m', 'init'], { cwd: dir })
}

describe('peck update', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await makeTmpDir()
    await initGitRepo(tmpDir)
  })
  afterEach(async () => { await removeTmpDir(tmpDir) })

  it('exits 0 and prints a done message', async () => {
    await run(['init'], tmpDir)
    const { exitCode, stdout } = await run(['update'], tmpDir)
    expect(exitCode).toBe(0)
    expect(stdout).toMatch(/Done/)
  })

  it('overwrites a modified agent file and creates a .bak backup', async () => {
    await run(['init'], tmpDir)
    const dest = join(tmpDir, '.opencode', 'agents', 'planner.md')
    await writeFile(dest, 'USER MODIFIED CONTENT', 'utf8')

    await run(['update'], tmpDir)

    expect(await readFile(join(dest + '.bak'), 'utf8')).toBe('USER MODIFIED CONTENT')
    const fresh = await readFile(dest, 'utf8')
    expect(fresh).not.toBe('USER MODIFIED CONTENT')
    expect(fresh.length).toBeGreaterThan(0)
  })

  it('is idempotent: a second run creates no new .bak files', async () => {
    await run(['init'], tmpDir)
    const dest = join(tmpDir, '.opencode', 'agents', 'planner.md')
    await writeFile(dest, 'OLD', 'utf8')

    await run(['update'], tmpDir)
    const bak = join(dest + '.bak')
    expect(await readFile(bak, 'utf8')).toBe('OLD')
    const contentAfterFirst = await readFile(dest, 'utf8')

    await run(['update'], tmpDir)
    // .bak unchanged — content already matched, no new backup written
    expect(await readFile(bak, 'utf8')).toBe('OLD')
    expect(await readFile(dest, 'utf8')).toBe(contentAfterFirst)
  })

  it('bumps peck.json version to current while preserving default_branch', async () => {
    await run(['init'], tmpDir)
    const configPath = join(tmpDir, '.opencode', 'peck.json')
    await writeFile(configPath, JSON.stringify({ version: '0.0.1', default_branch: 'master' }), 'utf8')

    await run(['update'], tmpDir)

    const config = JSON.parse(await readFile(configPath, 'utf8'))
    expect(config.version).toBe(VERSION)
    expect(config.default_branch).toBe('master')
  })

  it('does not modify opencode.jsonc', async () => {
    await run(['init'], tmpDir)
    const dest = join(tmpDir, '.opencode', 'opencode.jsonc')
    await writeFile(dest, 'SENTINEL', 'utf8')

    await run(['update'], tmpDir)

    expect(await readFile(dest, 'utf8')).toBe('SENTINEL')
  })

  it('writes any missing bundled file (simulates a newly-added agent)', async () => {
    await run(['init'], tmpDir)
    const dest = join(tmpDir, '.opencode', 'agents', 'planner.md')
    const bak = join(dest + '.bak')
    await rm(dest, { force: true })
    await rm(bak, { force: true })

    const { stdout } = await run(['update'], tmpDir)
    expect(stdout).toMatch(/write.*planner\.md/)
    const content = await readFile(dest, 'utf8')
    expect(content.length).toBeGreaterThan(0)
    // no backup when the file was missing
    await expect(access(bak)).rejects.toThrow()
  })

  it('updates the reflect skill with backup when modified', async () => {
    await run(['init'], tmpDir)
    const dest = join(tmpDir, '.opencode', 'skills', 'reflect', 'SKILL.md')
    await writeFile(dest, 'CUSTOM SKILL', 'utf8')

    await run(['update'], tmpDir)

    expect(await readFile(join(dest + '.bak'), 'utf8')).toBe('CUSTOM SKILL')
    const fresh = await readFile(dest, 'utf8')
    expect(fresh).not.toBe('CUSTOM SKILL')
  })

  it('exits 1 with a helpful message when peck.json is missing', async () => {
    const { exitCode, stderr } = await run(['update'], tmpDir)
    expect(exitCode).toBe(1)
    expect(stderr).toMatch(/peck init/)
  })

  it('exits 1 when not a git repository', async () => {
    const notGit = await makeTmpDir()
    const { exitCode, stderr } = await run(['update'], notGit)
    expect(exitCode).toBe(1)
    expect(stderr).toMatch(/not a git repository/)
    await removeTmpDir(notGit)
  })
})
