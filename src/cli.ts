#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { formatUnified } from './diff.js'

// Thin on purpose: this file only parses argv and does file I/O.
// Everything that can be tested without touching the filesystem lives
// in diff.ts.
function main(argv: string[]): number {
  const [pathA, pathB] = argv

  if (!pathA || !pathB) {
    process.stderr.write('usage: textdiff <file-a> <file-b>\n')
    return 1
  }

  let contentA: string
  let contentB: string
  try {
    contentA = readFileSync(pathA, 'utf8')
    contentB = readFileSync(pathB, 'utf8')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    process.stderr.write(`textdiff: ${message}\n`)
    return 1
  }

  const output = formatUnified(contentA, contentB, { aLabel: pathA, bLabel: pathB })
  process.stdout.write(output || `${pathA} and ${pathB} are identical\n`)
  return 0
}

process.exitCode = main(process.argv.slice(2))
