import { execFile, spawn } from 'node:child_process'
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
    const { stdout, stderr } = await execFileAsync('bun', [CLI, ...args], { cwd })
    return { stdout, stderr, exitCode: 0 }
  } catch (err: any) {
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      exitCode: err.code ?? 1,
    }
  }
}

export async function runWithStdin(args: string[], cwd: string, stdin: string): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn('bun', [CLI, ...args], { cwd, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    child.on('close', (code) => resolve({ stdout, stderr, exitCode: code ?? 1 }))
    child.stdin.write(stdin)
    child.stdin.end()
  })
}

export async function makeTmpDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'peck-test-'))
}

export async function removeTmpDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true })
}
