import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFile, access, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { run, makeTmpDir, removeTmpDir } from './helpers.js'

const execFileAsync = promisify(execFile)

async function initGitRepo(dir: string, defaultBranch = 'main') {
  await execFileAsync('git', ['init', '-b', defaultBranch], { cwd: dir })
  await execFileAsync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
  await execFileAsync('git', ['config', 'user.name', 'Test'], { cwd: dir })
  await writeFile(join(dir, 'README.md'), '# test')
  await execFileAsync('git', ['add', '.'], { cwd: dir })
  await execFileAsync('git', ['commit', '--no-gpg-sign', '-m', 'init'], { cwd: dir })
}

describe('peck init', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await makeTmpDir()
    await initGitRepo(tmpDir)
  })
  afterEach(async () => { await removeTmpDir(tmpDir) })

  it('exits 0 and prints a done message', async () => {
    const { exitCode, stdout } = await run(['init'], tmpDir)
    expect(exitCode).toBe(0)
    expect(stdout).toMatch(/Done/)
  })

  it('installs all agents except orchestrator', async () => {
    await run(['init'], tmpDir)
    const agentsDir = join(tmpDir, '.opencode', 'agents')
    for (const name of ['planner.md', 'implementer.md', 'explorer.md', 'code-reviewer.md', 'acceptance-reviewer.md']) {
      await expect(access(join(agentsDir, name))).resolves.toBeUndefined()
    }
    await expect(access(join(agentsDir, 'orchestrator.md'))).rejects.toThrow()
  })

  it('installs explorer as a read-only subagent', async () => {
    await run(['init'], tmpDir)
    const content = await readFile(join(tmpDir, '.opencode', 'agents', 'explorer.md'), 'utf8')
    expect(content).toMatch(/mode: subagent/)
    expect(content).toMatch(/"\*": deny/)
    expect(content).toMatch(/read: allow/)
  })

  it('requires planner to delegate source-code research to explorer', async () => {
    await run(['init'], tmpDir)
    const content = await readFile(join(tmpDir, '.opencode', 'agents', 'planner.md'), 'utf8')
    expect(content).toContain('subagent_type: "explorer"')
    expect(content).toContain('Do not inspect source code')
    expect(content).toContain('make at least one focused @explorer call')
  })

  it('creates the reflect skill directory and SKILL.md', async () => {
    await run(['init'], tmpDir)
    const dest = join(tmpDir, '.opencode', 'skills', 'reflect', 'SKILL.md')
    await expect(access(dest)).resolves.toBeUndefined()
    const content = await readFile(dest, 'utf8')
    expect(content).toMatch(/reflect/)
  })

  it('creates .opencode/peck.json with version and default_branch', async () => {
    await run(['init'], tmpDir)
    const config = JSON.parse(await readFile(join(tmpDir, '.opencode', 'peck.json'), 'utf8'))
    expect(config).toHaveProperty('version')
    expect(config).toHaveProperty('default_branch', 'main')
  })

  it('skips peck.json if it already exists', async () => {
    await run(['init'], tmpDir)
    const path = join(tmpDir, '.opencode', 'peck.json')
    await writeFile(path, JSON.stringify({ version: '0.0.0', default_branch: 'master' }), 'utf8')
    await run(['init'], tmpDir)
    const config = JSON.parse(await readFile(path, 'utf8'))
    expect(config.default_branch).toBe('master')
  })

  it('skips existing files without overwriting', async () => {
    await run(['init'], tmpDir)
    const dest = join(tmpDir, '.opencode', 'agents', 'planner.md')
    await writeFile(dest, 'SENTINEL', 'utf8')
    const { stdout } = await run(['init'], tmpDir)
    expect(stdout).toMatch(/skip/)
    expect(await readFile(dest, 'utf8')).toBe('SENTINEL')
  })

  it('creates .opencode/opencode.jsonc with plugin reference', async () => {
    await run(['init'], tmpDir)
    const dest = join(tmpDir, '.opencode', 'opencode.jsonc')
    await expect(access(dest)).resolves.toBeUndefined()
    const content = await readFile(dest, 'utf8')
    expect(JSON.parse(content)).toMatchObject({
      $schema: 'https://opencode.ai/config.json',
      plugin: ['opencode-subagent-completion-hook'],
      agent: { plan: { disable: true }, build: { disable: true } },
    })
  })

  it('skips opencode.jsonc if it already exists', async () => {
    await run(['init'], tmpDir)
    const dest = join(tmpDir, '.opencode', 'opencode.jsonc')
    await writeFile(dest, '{"plugin":[]}', 'utf8')
    const { stdout } = await run(['init'], tmpDir)
    expect(stdout).toMatch(/skip.*opencode\.jsonc/)
    expect(await readFile(dest, 'utf8')).toBe('{"plugin":[]}')
  })

  it('exits 1 when not a git repository', async () => {
    const notGit = await makeTmpDir()
    const { exitCode, stderr } = await run(['init'], notGit)
    expect(exitCode).toBe(1)
    expect(stderr).toMatch(/not a git repository/)
    await removeTmpDir(notGit)
  })
})
