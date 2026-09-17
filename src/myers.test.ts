import { test } from 'node:test'
import assert from 'node:assert/strict'
import { diffArrays } from './myers.js'
import type { DiffOp } from './myers.js'

function types(ops: DiffOp<unknown>[]): string {
  return ops.map((op) => op.type[0]).join('')
}

function rebuildA(ops: DiffOp<string>[]): string[] {
  return ops.filter((op) => op.type !== 'insert').map((op) => op.value)
}

function rebuildB(ops: DiffOp<string>[]): string[] {
  return ops.filter((op) => op.type !== 'delete').map((op) => op.value)
}

test('both arrays empty produces no ops', () => {
  assert.deepEqual(diffArrays([], []), [])
})

test('a empty, b non-empty is all inserts', () => {
  const ops = diffArrays([], ['x', 'y'])
  assert.equal(types(ops), 'ii')
  assert.deepEqual(rebuildB(ops), ['x', 'y'])
})

test('a non-empty, b empty is all deletes', () => {
  const ops = diffArrays(['x', 'y'], [])
  assert.equal(types(ops), 'dd')
  assert.deepEqual(rebuildA(ops), ['x', 'y'])
})

test('identical arrays produce only equal ops', () => {
  const ops = diffArrays(['a', 'b', 'c'], ['a', 'b', 'c'])
  assert.equal(types(ops), 'eee')
})

test('completely disjoint arrays delete everything then insert everything', () => {
  const ops = diffArrays(['a', 'b'], ['x', 'y'])
  assert.deepEqual(rebuildA(ops), ['a', 'b'])
  assert.deepEqual(rebuildB(ops), ['x', 'y'])
  assert.equal(ops.filter((op) => op.type === 'equal').length, 0)
})

test('single middle change keeps shared prefix and suffix as equal', () => {
  const ops = diffArrays(['a', 'b', 'c'], ['a', 'x', 'c'])
  assert.deepEqual(
    ops.map((op) => [op.type, op.value]),
    [
      ['equal', 'a'],
      ['delete', 'b'],
      ['insert', 'x'],
      ['equal', 'c'],
    ]
  )
})

test('every op sequence reconstructs both inputs exactly', () => {
  const a = ['a', 'b', 'c', 'd', 'e']
  const b = ['b', 'c', 'x', 'e', 'f']
  const ops = diffArrays(a, b)
  assert.deepEqual(rebuildA(ops), a)
  assert.deepEqual(rebuildB(ops), b)
})

test('custom equals function is used instead of ===', () => {
  const ops = diffArrays(['A', 'b'], ['a', 'B'], (x, y) => x.toLowerCase() === y.toLowerCase())
  assert.equal(types(ops), 'ee')
})

test('duplicate elements are matched without duplicating ops', () => {
  const ops = diffArrays(['a', 'a', 'a'], ['a', 'a'])
  assert.deepEqual(rebuildA(ops), ['a', 'a', 'a'])
  assert.deepEqual(rebuildB(ops), ['a', 'a'])
  assert.equal(ops.filter((op) => op.type === 'delete').length, 1)
})
