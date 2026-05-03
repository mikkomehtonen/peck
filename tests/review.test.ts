import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { runWithStdin, makeTmpDir, removeTmpDir } from './helpers.js'

const execFileAsync = promisify(execFile)

const PASS_REPORT = `## Summary\n\nAll changes look good.\n\n**Pass**`
const FAIL_REPORT = `## Summary\n\nMissing error handling.\n\n**Fail**`
const UNKNOWN_REPORT = `## Summary\n\nSomething was reviewed but no verdict given.`

async function initGitRepo(dir: string) {
  await execFileAsync('git', ['init', '-b', 'main'], { cwd: dir })
  await execFileAsync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
  await execFileAsync('git', ['config', 'user.name', 'Test'], { cwd: dir })
  await writeFile(join(dir, 'README.md'), '# test')
  await execFileAsync('git', ['add', '.'], { cwd: dir })
  await execFileAsync('git', ['commit', '--no-gpg-sign', '-m', 'init'], { cwd: dir })
}

async function gitLog(dir: string, format: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['log', '-1', `--format=${format}`], { cwd: dir })
  return stdout.trim()
}

async function gitStagedFiles(dir: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['diff', '--cached', '--name-only'], { cwd: dir })
  return stdout.trim()
}

async function gitCommitFiles(dir: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['show', '--stat', '--format=', 'HEAD'], { cwd: dir })
  return stdout.trim()
}

describe('kiss-spec code-review commit', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await makeTmpDir()
    await initGitRepo(tmpDir)
  })
  afterEach(async () => { await removeTmpDir(tmpDir) })

  describe('Pass verdict', () => {
    it('exits 0', async () => {
      const { exitCode } = await runWithStdin(['code-review', 'commit'], tmpDir, PASS_REPORT)
      expect(exitCode).toBe(0)
    })

    it('prints Verdict: Pass and commit hint, not the full report', async () => {
      const { stdout } = await runWithStdin(['code-review', 'commit'], tmpDir, PASS_REPORT)
      expect(stdout).toContain('Verdict: Pass')
      expect(stdout).toContain('git show')
      expect(stdout).not.toContain('All changes look good')
    })

    it('creates a commit with the correct message', async () => {
      await runWithStdin(['code-review', 'commit'], tmpDir, PASS_REPORT)
      const subject = await gitLog(tmpDir, '%s')
      const body = await gitLog(tmpDir, '%b')
      expect(subject).toBe('review: Pass')
      expect(body).toContain(PASS_REPORT)
    })
  })

  describe('Fail verdict', () => {
    it('exits 0', async () => {
      const { exitCode } = await runWithStdin(['code-review', 'commit'], tmpDir, FAIL_REPORT)
      expect(exitCode).toBe(0)
    })

    it('prints the full report, Verdict: Fail, and fix instruction', async () => {
      const { stdout } = await runWithStdin(['code-review', 'commit'], tmpDir, FAIL_REPORT)
      expect(stdout).toContain('Missing error handling')
      expect(stdout).toContain('Verdict: Fail')
      expect(stdout).toContain('fix all blocking issues')
    })

    it('creates a commit with the correct message', async () => {
      await runWithStdin(['code-review', 'commit'], tmpDir, FAIL_REPORT)
      const subject = await gitLog(tmpDir, '%s')
      expect(subject).toBe('review: Fail')
    })
  })

  describe('Unknown verdict', () => {
    it('exits 0', async () => {
      const { exitCode } = await runWithStdin(['code-review', 'commit'], tmpDir, UNKNOWN_REPORT)
      expect(exitCode).toBe(0)
    })

    it('prints the full report and unknown message, no fix instruction', async () => {
      const { stdout } = await runWithStdin(['code-review', 'commit'], tmpDir, UNKNOWN_REPORT)
      expect(stdout).toContain('Something was reviewed')
      expect(stdout).toContain('could not be determined')
      expect(stdout).not.toContain('fix all blocking issues')
    })

    it('creates a commit with review: Unknown', async () => {
      await runWithStdin(['code-review', 'commit'], tmpDir, UNKNOWN_REPORT)
      const subject = await gitLog(tmpDir, '%s')
      expect(subject).toBe('review: Unknown')
    })
  })

  describe('empty commit guarantee', () => {
    it('does not include staged files in the review commit', async () => {
      await writeFile(join(tmpDir, 'staged.ts'), 'export const x = 1')
      await execFileAsync('git', ['add', 'staged.ts'], { cwd: tmpDir })

      await runWithStdin(['code-review', 'commit'], tmpDir, PASS_REPORT)

      expect(await gitCommitFiles(tmpDir)).toBe('')
    })

    it('leaves staged files staged after the commit', async () => {
      await writeFile(join(tmpDir, 'staged.ts'), 'export const x = 1')
      await execFileAsync('git', ['add', 'staged.ts'], { cwd: tmpDir })

      await runWithStdin(['code-review', 'commit'], tmpDir, PASS_REPORT)

      expect(await gitStagedFiles(tmpDir)).toContain('staged.ts')
    })
  })

  describe('verdict detection edge cases', () => {
    it('prefers bold **Pass** over bare pass', async () => {
      const report = `this might pass or fail\n\n**Pass**`
      await runWithStdin(['code-review', 'commit'], tmpDir, report)
      expect(await gitLog(tmpDir, '%s')).toBe('review: Pass')
    })

    it('prefers bold **Fail** over bare pass word', async () => {
      const report = `things mostly pass\n\n**Fail**`
      await runWithStdin(['code-review', 'commit'], tmpDir, report)
      expect(await gitLog(tmpDir, '%s')).toBe('review: Fail')
    })

    it('last bold token wins when both appear', async () => {
      const report = `**Pass**\n\nActually wait.\n\n**Fail**`
      await runWithStdin(['code-review', 'commit'], tmpDir, report)
      expect(await gitLog(tmpDir, '%s')).toBe('review: Fail')
    })

    it('falls back to bare word when no bold tokens', async () => {
      const report = `After review: Fail`
      await runWithStdin(['code-review', 'commit'], tmpDir, report)
      expect(await gitLog(tmpDir, '%s')).toBe('review: Fail')
    })
  })
})
