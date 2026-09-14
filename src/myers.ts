export type DiffOpType = 'equal' | 'delete' | 'insert'

export interface DiffOp<T> {
  type: DiffOpType
  value: T
}

/**
 * Myers O(ND) diff over two arbitrary arrays.
 *
 * Pure: it never touches the outside world, never mutates its
 * inputs, and always returns the same ops for the same (a, b, equals).
 * That's what makes it possible to test with plain fixed arrays instead
 * of files or fixtures.
 */
export function diffArrays<T>(
  a: readonly T[],
  b: readonly T[],
  equals: (x: T, y: T) => boolean = (x, y) => x === y
): DiffOp<T>[] {
  const n = a.length
  const m = b.length
  const max = n + m

  if (max === 0) return []

  // v[offset + k] is the furthest-reaching x reached so far on diagonal
  // k = x - y. Using a flat typed array indexed by an offset avoids the
  // Map<number, number> the textbook description of the algorithm uses.
  const offset = max
  const v = new Int32Array(2 * max + 1)
  const trace: Int32Array[] = []

  let finalD = -1
  search: for (let d = 0; d <= max; d++) {
    // Snapshot before mutating v for this depth: the entries we'll need
    // during backtracking (parity d - 1) are never touched during the
    // pass for depth d, so this snapshot is equivalent to one taken
    // after the pass, but simpler to reason about.
    trace.push(v.slice())

    for (let k = -d; k <= d; k += 2) {
      let x: number
      if (k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])) {
        x = v[offset + k + 1]
      } else {
        x = v[offset + k - 1] + 1
      }
      let y = x - k

      while (x < n && y < m && equals(a[x], b[y])) {
        x++
        y++
      }

      v[offset + k] = x

      if (x >= n && y >= m) {
        finalD = d
        break search
      }
    }
  }

  return backtrack(a, b, trace, offset, finalD)
}

function backtrack<T>(
  a: readonly T[],
  b: readonly T[],
  trace: Int32Array[],
  offset: number,
  finalD: number
): DiffOp<T>[] {
  const ops: DiffOp<T>[] = []
  let x = a.length
  let y = b.length

  for (let d = finalD; d > 0; d--) {
    const v = trace[d]
    const k = x - y
    const prevK = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]) ? k + 1 : k - 1
    const prevX = v[offset + prevK]
    const prevY = prevX - prevK

    while (x > prevX && y > prevY) {
      ops.push({ type: 'equal', value: a[x - 1] })
      x--
      y--
    }

    if (x === prevX) {
      ops.push({ type: 'insert', value: b[y - 1] })
      y--
    } else {
      ops.push({ type: 'delete', value: a[x - 1] })
      x--
    }
  }

  while (x > 0 && y > 0) {
    ops.push({ type: 'equal', value: a[x - 1] })
    x--
    y--
  }
  while (x > 0) {
    ops.push({ type: 'delete', value: a[x - 1] })
    x--
  }
  while (y > 0) {
    ops.push({ type: 'insert', value: b[y - 1] })
    y--
  }

  ops.reverse()
  return ops
}
