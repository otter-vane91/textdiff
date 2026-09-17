# textdiff

A small TypeScript library for computing diffs between two pieces of
text, plus a thin CLI that prints them in the familiar unified diff
format.

## The problem

You have two versions of some text — two config files, two runs of a
generated report, before/after in a test assertion — and you want to
know what actually changed, in a way a human can read. Line-by-line
`===` equality checks don't tell you *where* things diverge, and
pulling in a diff library for this usually means dragging along a
dependency you didn't need for such a small piece of logic.

`textdiff` implements the Myers diff algorithm (the same family of
algorithm behind `diff` and `git diff`) directly on top of the
JavaScript standard library, with no dependencies. Every exported
function is pure: same inputs in, same output out, no reading from
disk, no hidden state. That makes the whole library trivial to unit
test with plain string and array literals.

## Library usage

```ts
import { diffLines, diffWords, formatUnified } from 'textdiff'

const before = 'one\ntwo\nthree\n'
const after = 'one\ntwo and a half\nthree\n'

for (const op of diffLines(before, after)) {
  console.log(op.type, JSON.stringify(op.value))
}
// equal  "one\n"
// delete "two\n"
// insert "two and a half\n"
// equal  "three\n"

console.log(formatUnified(before, after, { aLabel: 'before.txt', bLabel: 'after.txt' }))
// --- before.txt
// +++ after.txt
// @@ -1,3 +1,3 @@
//  one
// -two
// +two and a half
//  three
```

`diffWords` works the same way but tokenizes on whitespace instead of
newlines, which is useful for diffing a single paragraph or sentence
instead of a whole file.

Every diff function is built on top of the generic `diffArrays`, which
works over any array of any type given an equality function — line
arrays and word arrays are just the two tokenizers this package ships
with.

## CLI usage

```sh
node dist/cli.js before.txt after.txt
```

Prints a unified diff to stdout, or a one-line "identical" message
when there are no differences. Exit code is 0 either way; it's 1 if
the arguments are wrong or a file can't be read.

## Building

This is a plain TypeScript project with no dependencies, so a normal
`tsc` build (compiler installed however you like — global install,
`npx typescript`, whatever your toolchain already gives you) produces
`dist/` from `tsconfig.json`.

## Testing

Tests use Node's built-in test runner, so there's nothing extra to
install:

```sh
npm test
```

This compiles the project first (`tsc`), then runs every `*.test.js`
file under `dist/`.

## Status

Early. Line and word diffing plus unified-diff formatting work now.
See the roadmap for what's next.
