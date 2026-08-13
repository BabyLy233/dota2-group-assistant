import { execFileSync } from 'node:child_process'

const PORTS = [3000, 5173]

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
      .toString()
      .trim()
  } catch {
    return ''
  }
}

for (const port of PORTS) {
  const pids = run('lsof', ['-ti', `:${port}`])
    .split('\n')
    .filter(Boolean)
  for (const pid of pids) {
    const info = run('ps', ['-o', 'comm=', '-p', pid])
    console.log(`[dev] port ${port} occupied by pid ${pid} (${info}), killing...`)
    try {
      execFileSync('kill', ['-9', pid])
    } catch {
      // already gone
    }
  }
}
