import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFile, access, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { run, makeTmpDir, removeTmpDir } from './helpers.js'

const execFileAsync = promisify(execFile)

async function initGitRepo(dir: string) {
  await execFileAsync('git', ['init'], { cwd: dir })
  await execFileAsync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
  await execFileAsync('git', ['config', 'user.name', 'Test'], { cwd: dir })
  // initial commit so branches can be created
  await writeFile(join(dir, 'README.md'), '# test')
  await execFileAsync('git', ['add', '.'], { cwd: dir })
  await execFileAsync('git', ['commit', '--no-gpg-sign', '-m', 'init'], { cwd: dir })
}

describe('kiss-spec story create', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await makeTmpDir()
    await initGitRepo(tmpDir)
  })
  afterEach(async () => { await removeTmpDir(tmpDir) })

  it('outputs valid JSON with GIT_BRANCH_NAME, STORY_FILE, PRODUCT_FILE', async () => {
    const { exitCode, stdout } = await run(['story', 'create', 'user can log in'], tmpDir)
    expect(exitCode).toBe(0)
    const json = JSON.parse(stdout)
    expect(json).toHaveProperty('GIT_BRANCH_NAME')
    expect(json).toHaveProperty('STORY_FILE')
    expect(json).toHaveProperty('PRODUCT_FILE')
  })

  it('creates a numbered branch and story directory', async () => {
    const { stdout } = await run(['story', 'create', 'user can log in'], tmpDir)
    const { GIT_BRANCH_NAME, STORY_FILE } = JSON.parse(stdout)
    expect(GIT_BRANCH_NAME).toMatch(/^001-user-can-log-in$/)
    await expect(access(STORY_FILE)).resolves.toBeUndefined()
  })

  it('increments the number for subsequent stories', async () => {
    const { stdout: out1 } = await run(['story', 'create', 'first story'], tmpDir)
    // switch back to main so we can create another branch
    await execFileAsync('git', ['checkout', 'master'], { cwd: tmpDir }).catch(() =>
      execFileAsync('git', ['checkout', 'main'], { cwd: tmpDir })
    )
    const { stdout: out2 } = await run(['story', 'create', 'second story'], tmpDir)
    expect(JSON.parse(out1).GIT_BRANCH_NAME).toMatch(/^001-/)
    expect(JSON.parse(out2).GIT_BRANCH_NAME).toMatch(/^002-/)
  })

  it('creates docs/product.md if it does not exist', async () => {
    const { stdout } = await run(['story', 'create', 'my feature'], tmpDir)
    const { PRODUCT_FILE } = JSON.parse(stdout)
    await expect(access(PRODUCT_FILE)).resolves.toBeUndefined()
    const content = await readFile(PRODUCT_FILE, 'utf8')
    expect(content).toMatch(/Product Name/)
  })

  it('does not overwrite existing docs/product.md', async () => {
    await mkdir(join(tmpDir, 'docs'), { recursive: true })
    await writeFile(join(tmpDir, 'docs', 'product.md'), 'SENTINEL', 'utf8')
    const { stdout } = await run(['story', 'create', 'my feature'], tmpDir)
    const { PRODUCT_FILE } = JSON.parse(stdout)
    const content = await readFile(PRODUCT_FILE, 'utf8')
    expect(content).toBe('SENTINEL')
  })

  it('exits 1 when not a git repository', async () => {
    const notGit = await makeTmpDir()
    const { exitCode, stderr } = await run(['story', 'create', 'foo'], notGit)
    expect(exitCode).toBe(1)
    expect(stderr).toMatch(/not a git repository/)
    await removeTmpDir(notGit)
  })
})

describe('kiss-spec story list', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await makeTmpDir()
    await initGitRepo(tmpDir)
  })
  afterEach(async () => { await removeTmpDir(tmpDir) })

  it('shows a message when there are no stories', async () => {
    const { exitCode, stdout } = await run(['story', 'list'], tmpDir)
    expect(exitCode).toBe(0)
    expect(stdout).toMatch(/No stories yet/)
  })

  it('lists stories with number and slug', async () => {
    await run(['story', 'create', 'first feature'], tmpDir)
    await execFileAsync('git', ['checkout', 'master'], { cwd: tmpDir }).catch(() =>
      execFileAsync('git', ['checkout', 'main'], { cwd: tmpDir })
    )
    await run(['story', 'create', 'second feature'], tmpDir)
    await execFileAsync('git', ['checkout', 'master'], { cwd: tmpDir }).catch(() =>
      execFileAsync('git', ['checkout', 'main'], { cwd: tmpDir })
    )
    const { exitCode, stdout } = await run(['story', 'list'], tmpDir)
    expect(exitCode).toBe(0)
    expect(stdout).toMatch(/001.*first-feature/)
    expect(stdout).toMatch(/002.*second-feature/)
  })
})

describe('kiss-spec story load', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await makeTmpDir()
    await initGitRepo(tmpDir)
  })
  afterEach(async () => { await removeTmpDir(tmpDir) })

  it('prints the story content to stdout', async () => {
    const { stdout: created } = await run(['story', 'create', 'my feature'], tmpDir)
    const { GIT_BRANCH_NAME } = JSON.parse(created)
    const { exitCode, stdout } = await run(['story', 'load', GIT_BRANCH_NAME], tmpDir)
    expect(exitCode).toBe(0)
    expect(stdout).toMatch(/Story Title/)
  })

  it('exits 1 for a missing story', async () => {
    const { exitCode, stderr } = await run(['story', 'load', 'does-not-exist'], tmpDir)
    expect(exitCode).toBe(1)
    expect(stderr).toMatch(/not found/)
  })
})
