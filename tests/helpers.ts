import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const CLI = new URL('../dist/index.js', import.meta.url).pathname

export interface RunResult {
  stdout: string
  stderr: string
  exitCode: number
}

export async function run(args: string[], cwd: string): Promise<RunResult> {
  try {
    const { stdout, stderr } = await execFileAsync('node', [CLI, ...args], { cwd })
    return { stdout, stderr, exitCode: 0 }
  } catch (err: any) {
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      exitCode: err.code ?? 1,
    }
  }
}

export async function makeTmpDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'kiss-test-'))
}

export async function removeTmpDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true })
}
