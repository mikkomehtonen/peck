import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function getRepoRoot(cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', '--show-toplevel'], { cwd })
    return stdout.trim()
  } catch {
    process.stderr.write('Error: not a git repository\n')
    process.exit(1)
  }
}

export async function git(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd })
  return stdout.trim()
}

const CANDIDATE_BRANCHES = ['master', 'main', 'dev']

export async function detectDefaultBranch(repoRoot: string): Promise<string> {
  // Try remote HEAD first (reliable for cloned repos)
  try {
    const ref = await git(['symbolic-ref', 'refs/remotes/origin/HEAD'], repoRoot)
    const branch = ref.replace('refs/remotes/origin/', '').trim()
    if (branch) return branch
  } catch {
    // no remote or HEAD not set
  }

  // Fall back to checking which candidate branch exists locally
  for (const branch of CANDIDATE_BRANCHES) {
    try {
      await git(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], repoRoot)
      return branch
    } catch {
      // branch doesn't exist, try next
    }
  }

  process.stderr.write(
    `Error: could not detect default branch. Expected one of: ${CANDIDATE_BRANCHES.join(', ')}\n`
  )
  process.exit(1)
}
