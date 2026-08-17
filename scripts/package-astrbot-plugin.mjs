import { execFileSync } from 'node:child_process'
import { existsSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pluginDir = path.join(projectRoot, 'astrbot-plugin')
const outputPath = path.join(projectRoot, 'astrbot_plugin_dota2_group_assistant.zip')

if (!existsSync(pluginDir)) {
  console.error(`Plugin directory not found: ${pluginDir}`)
  process.exit(1)
}

if (existsSync(outputPath)) {
  rmSync(outputPath)
}

try {
  execFileSync(
    'zip',
    [
      '-qr',
      outputPath,
      '.',
      '-x',
      '__pycache__/*',
      '*/__pycache__/*',
      '*.pyc',
      '*.pyo',
      '.DS_Store',
    ],
    { cwd: pluginDir, stdio: 'inherit' },
  )
} catch (error) {
  if (error?.status === 127) {
    console.error('The zip command is required to package the AstrBot plugin.')
  }
  process.exit(error?.status || 1)
}

const size = statSync(outputPath).size
console.log(`AstrBot plugin packaged: ${path.relative(projectRoot, outputPath)} (${size} bytes)`)
