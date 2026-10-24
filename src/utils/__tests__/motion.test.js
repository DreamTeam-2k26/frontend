import assert from 'node:assert/strict'
import { test } from 'node:test'
import { listItemMotion } from '../motion.js'

test('atraso da lista cresce só até o limite (listas grandes não acumulam espera)', () => {
  assert.equal(listItemMotion(0).transition.delay, 0)
  assert.ok(listItemMotion(2).transition.delay > listItemMotion(1).transition.delay)
  assert.equal(listItemMotion(6).transition.delay, listItemMotion(50).transition.delay)
  assert.ok(listItemMotion(50).transition.delay <= 0.25)
})
