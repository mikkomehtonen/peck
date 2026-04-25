import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { run, makeTmpDir, removeTmpDir } from './helpers.js'

describe('kiss story create', () => {
  let tmpDir: string

  beforeEach(async () => { tmpDir = await makeTmpDir() })
  afterEach(async () => { await removeTmpDir(tmpDir) })

  it('creates a slugified markdown file', async () => {
    const { exitCode } = await run(['story', 'create', 'User can log in'], tmpDir)
    expect(exitCode).toBe(0)
    await expect(access(join(tmpDir, 'stories', 'user-can-log-in.md'))).resolves.toBeUndefined()
  })

  it('fills in name and date in the template', async () => {
    await run(['story', 'create', 'User can log in'], tmpDir)
    const content = await readFile(join(tmpDir, 'stories', 'user-can-log-in.md'), 'utf8')
    expect(content).toMatch(/# User can log in/)
    expect(content).toMatch(/\*\*Date:\*\* \d{4}-\d{2}-\d{2}/)
    expect(content).toMatch(/\*\*Slug:\*\* user-can-log-in/)
  })

  it('exits 1 if the story already exists', async () => {
    await run(['story', 'create', 'Duplicate story'], tmpDir)
    const { exitCode, stderr } = await run(['story', 'create', 'Duplicate story'], tmpDir)
    expect(exitCode).toBe(1)
    expect(stderr).toMatch(/already exists/)
  })
})

describe('kiss story load', () => {
  let tmpDir: string

  beforeEach(async () => { tmpDir = await makeTmpDir() })
  afterEach(async () => { await removeTmpDir(tmpDir) })

  it('prints the story content to stdout', async () => {
    await run(['story', 'create', 'My Feature'], tmpDir)
    const { exitCode, stdout } = await run(['story', 'load', 'my-feature'], tmpDir)
    expect(exitCode).toBe(0)
    expect(stdout).toMatch(/# My Feature/)
  })

  it('exits 1 for a missing story', async () => {
    const { exitCode, stderr } = await run(['story', 'load', 'does-not-exist'], tmpDir)
    expect(exitCode).toBe(1)
    expect(stderr).toMatch(/not found/)
  })
})
