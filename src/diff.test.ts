import { test } from 'node:test'
import assert from 'node:assert/strict'
import { diffLines, diffWords, formatUnified, splitLines, splitWords } from './diff.js'

test('splitLines on an empty string returns no lines', () => {
  assert.deepEqual(splitLines(''), [])
})

test('splitLines keeps the newline attached to the line it ends', () => {
  assert.deepEqual(splitLines('a\nb\nc\n'), ['a\n', 'b\n', 'c\n'])
})

test('splitLines leaves a missing trailing newline off the last line', () => {
  assert.deepEqual(splitLines('a\nb\nc'), ['a\n', 'b\n', 'c'])
})

test('splitLines output rejoins into the exact original text', () => {
  for (const text of ['', 'a\n', 'a\nb\nc', 'a\nb\nc\n', '\n\n\n']) {
    assert.equal(splitLines(text).join(''), text)
  }
})

test('splitWords splits into alternating whitespace and non-whitespace runs', () => {
  assert.deepEqual(splitWords('one  two\tthree'), ['one', '  ', 'two', '\t', 'three'])
})

test('splitWords output rejoins into the exact original text', () => {
  const text = '  leading and  trailing  '
  assert.equal(splitWords(text).join(''), text)
})

test('diffWords finds a single changed word inside a sentence', () => {
  const ops = diffWords('the quick fox', 'the slow fox')
  assert.deepEqual(
    ops.map((op) => [op.type, op.value]),
    [
      ['equal', 'the'],
      ['equal', ' '],
      ['delete', 'quick'],
      ['insert', 'slow'],
      ['equal', ' '],
      ['equal', 'fox'],
    ]
  )
})

test('formatUnified returns an empty string for identical input', () => {
  assert.equal(formatUnified('same\n', 'same\n'), '')
})

test('formatUnified handles a change on the very first line', () => {
  const a = 'one\ntwo\nthree\nfour\n'
  const b = 'ONE\ntwo\nthree\nfour\n'
  const expected = ['--- a', '+++ b', '@@ -1,4 +1,4 @@', '-one', '+ONE', ' two', ' three', ' four'].join(
    '\n'
  ) + '\n'
  assert.equal(formatUnified(a, b), expected)
})

test('formatUnified handles a pure insertion at the end of the file', () => {
  const a = 'one\ntwo\n'
  const b = 'one\ntwo\nthree\n'
  const expected = ['--- a', '+++ b', '@@ -1,2 +1,3 @@', ' one', ' two', '+three'].join('\n') + '\n'
  assert.equal(formatUnified(a, b), expected)
})

test('formatUnified merges two changes that fall within one context window', () => {
  const lines = Array.from({ length: 10 }, (_, i) => `line${i + 1}\n`)
  const a = lines.join('')
  const changed = [...lines]
  changed[1] = 'line2X\n'
  changed[4] = 'line5X\n'
  const b = changed.join('')

  const expected =
    [
      '--- a',
      '+++ b',
      '@@ -1,8 +1,8 @@',
      ' line1',
      '-line2',
      '+line2X',
      ' line3',
      ' line4',
      '-line5',
      '+line5X',
      ' line6',
      ' line7',
      ' line8',
    ].join('\n') + '\n'
  assert.equal(formatUnified(a, b), expected)
})

test('formatUnified splits two distant changes into separate hunks', () => {
  const lines = Array.from({ length: 12 }, (_, i) => `line${i + 1}\n`)
  const a = lines.join('')
  const changed = [...lines]
  changed[1] = 'line2X\n'
  changed[9] = 'line10X\n'
  const b = changed.join('')

  const expected =
    [
      '--- a',
      '+++ b',
      '@@ -1,5 +1,5 @@',
      ' line1',
      '-line2',
      '+line2X',
      ' line3',
      ' line4',
      ' line5',
      '@@ -7,6 +7,6 @@',
      ' line7',
      ' line8',
      ' line9',
      '-line10',
      '+line10X',
      ' line11',
      ' line12',
    ].join('\n') + '\n'
  assert.equal(formatUnified(a, b), expected)
})

test('formatUnified uses custom file labels when given', () => {
  const output = formatUnified('a\n', 'b\n', { aLabel: 'before.txt', bLabel: 'after.txt' })
  const [firstLine, secondLine] = output.split('\n')
  assert.equal(firstLine, '--- before.txt')
  assert.equal(secondLine, '+++ after.txt')
})

test('formatUnified with context 0 shows only the changed lines', () => {
  const a = 'one\ntwo\nthree\n'
  const b = 'one\nTWO\nthree\n'
  const expected = ['--- a', '+++ b', '@@ -2,1 +2,1 @@', '-two', '+TWO'].join('\n') + '\n'
  assert.equal(formatUnified(a, b, { context: 0 }), expected)
})
