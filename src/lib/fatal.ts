export function fatal(message: string): never {
  process.stderr.write(`Error: ${message}\n`)
  process.exit(1)
}
