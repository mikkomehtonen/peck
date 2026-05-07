import { Command } from 'commander'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { getRepoRoot } from '../lib/git.js'

const execFileAsync = promisify(execFile)

export function codeReviewCommand(): Command {
  return new Command('code-review')
    .addCommand(commitReviewCommand('code-review', 'review: ${verdict}'))
}

export function acceptanceReviewCommand(): Command {
  return new Command('acceptance-review')
    .addCommand(commitReviewCommand('acceptance-review', 'review(acceptance): ${verdict}'))
}

function commitReviewCommand(name: string, subjectFormat: string): Command {
  return new Command('commit')
    .description(`Commit a ${name} report piped from stdin`)
    .action(async () => {
      const repoRoot = await getRepoRoot(process.cwd())
      const raw = (await readStdin()).trim()
      const report = raw
        .replace(/^task_id:.*\n?/, "")
        .replace(/<task_result>\n?/g, "")
        .replace(/<\/task_result>\n?/g, "")
        .trim()

      if (!report) {
        process.stderr.write('Report is empty, nothing to commit.\n')
        process.exit(1)
      }

      const verdict = parseVerdict(report)
      const subject = subjectFormat.replace('${verdict}', verdict ?? 'Unknown')
      const hash = await commitReport(repoRoot, subject, report)

      if (verdict === 'Pass') {
        process.stdout.write(`Verdict: Pass\n`)
        process.stdout.write(`Report committed. To view this report again: \`git show ${hash} --format=%B -s\`\n`)
      } else {
        process.stdout.write(raw + '\n\n')
        if (verdict === 'Fail') {
          process.stdout.write(`Verdict: Fail\n`)
          process.stdout.write(`You must fix all blocking issues listed above before re-running the reviewer. When re-running, reuse the same task_id if working on the same task.\n`)
        } else {
          process.stdout.write(`Verdict could not be determined from the report.\n`)
        }
        process.stdout.write(`Report committed (${hash}).\n`)
      }
    })
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

// Captures bold (**Pass**/**Fail**) or bare word — bold preferred, last occurrence wins
const VERDICT_RE = /(\*\*)(pass|fail)\*\*|\b(pass|fail)\b/gi

function parseVerdict(report: string): 'Pass' | 'Fail' | null {
  const matches = [...report.matchAll(VERDICT_RE)]
  if (!matches.length) return null
  const bold = matches.filter(m => m[1])
  const winner = (bold.length ? bold : matches).at(-1)!
  return (winner[2] ?? winner[3]).toLowerCase() === 'pass' ? 'Pass' : 'Fail'
}

async function commitReport(cwd: string, subject: string, report: string): Promise<string> {
  const message = `${subject}\n\n${report}`
  const { stdout: treeOut } = await execFileAsync('git', ['rev-parse', 'HEAD^{tree}'], { cwd })
  const { stdout: parentOut } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd })

  // spawn used here because execFile splits multiline strings across arguments;
  // commit-tree expects the full message via stdin with -F -
  const hash = await new Promise<string>((resolve, reject) => {
    const proc = spawn(
      'git',
      ['commit-tree', treeOut.trim(), '-p', parentOut.trim(), '-F', '-'],
      { cwd, stdio: ['pipe', 'pipe', 'inherit'] }
    )
    let out = ''
    proc.stdout!.on('data', (d: Buffer) => { out += d.toString() })
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(`git commit-tree failed with exit code ${code}`))
      else resolve(out.trim())
    })
    proc.stdin!.write(message)
    proc.stdin!.end()
  })

  await execFileAsync('git', ['update-ref', 'HEAD', hash], { cwd })
  return hash
}
