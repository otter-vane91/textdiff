import { diffArrays } from './myers.js'
import type { DiffOp } from './myers.js'

export type { DiffOp } from './myers.js'
export { diffArrays } from './myers.js'

/**
 * Splits text into lines, keeping each line's trailing newline attached
 * to it. Doing it this way means `splitLines(text).join('')` always
 * reconstructs the original text exactly, including a missing newline
 * at the end of the file.
 */
export function splitLines(text: string): string[] {
  if (text === '') return []
  return text.split(/(?<=\n)/)
}

/** Splits text into runs of whitespace and runs of non-whitespace. */
export function splitWords(text: string): string[] {
  return text.match(/\s+|\S+/g) ?? []
}

export function diffLines(a: string, b: string): DiffOp<string>[] {
  return diffArrays(splitLines(a), splitLines(b))
}

export function diffWords(a: string, b: string): DiffOp<string>[] {
  return diffArrays(splitWords(a), splitWords(b))
}

export interface UnifiedDiffOptions {
  /** Number of unchanged lines to show around each change. Default 3. */
  context?: number
  aLabel?: string
  bLabel?: string
}

/**
 * Renders a unified diff, the `--- a` / `+++ b` / `@@ ... @@` format
 * used by `diff -u` and `git diff`. Built entirely on top of diffLines,
 * so given the same two strings and options it always produces the
 * same text.
 */
export function formatUnified(a: string, b: string, options: UnifiedDiffOptions = {}): string {
  const context = options.context ?? 3
  const ops = diffLines(a, b)

  if (ops.every((op) => op.type === 'equal')) return ''

  // Running counts of how many old/new lines have been consumed by the
  // time we reach op index i, so hunk headers can be computed by
  // subtracting two prefix sums instead of re-scanning.
  const oldCountAt: number[] = new Array(ops.length + 1)
  const newCountAt: number[] = new Array(ops.length + 1)
  oldCountAt[0] = 0
  newCountAt[0] = 0
  for (let i = 0; i < ops.length; i++) {
    oldCountAt[i + 1] = oldCountAt[i] + (ops[i].type !== 'insert' ? 1 : 0)
    newCountAt[i + 1] = newCountAt[i] + (ops[i].type !== 'delete' ? 1 : 0)
  }

  const changedIndexes = ops
    .map((op, i) => (op.type !== 'equal' ? i : -1))
    .filter((i) => i >= 0)

  const ranges: Array<[number, number]> = []
  for (const i of changedIndexes) {
    const start = Math.max(0, i - context)
    const end = Math.min(ops.length - 1, i + context)
    const last = ranges[ranges.length - 1]
    if (last && start <= last[1] + 1) {
      last[1] = Math.max(last[1], end)
    } else {
      ranges.push([start, end])
    }
  }

  const lines: string[] = [`--- ${options.aLabel ?? 'a'}`, `+++ ${options.bLabel ?? 'b'}`]

  for (const [start, end] of ranges) {
    const oldCount = oldCountAt[end + 1] - oldCountAt[start]
    const newCount = newCountAt[end + 1] - newCountAt[start]
    const oldStart = oldCount === 0 ? oldCountAt[start] : oldCountAt[start] + 1
    const newStart = newCount === 0 ? newCountAt[start] : newCountAt[start] + 1

    lines.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`)

    for (let i = start; i <= end; i++) {
      const op = ops[i]
      const prefix = op.type === 'equal' ? ' ' : op.type === 'delete' ? '-' : '+'
      const value = op.value.endsWith('\n') ? op.value.slice(0, -1) : op.value
      lines.push(prefix + value)
    }
  }

  return lines.join('\n') + '\n'
}
