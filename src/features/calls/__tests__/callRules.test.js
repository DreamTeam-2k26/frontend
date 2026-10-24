import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  applyCallChange,
  formatElapsed,
  fromLocalInput,
  isDue,
  liveCallOf,
  msUntil,
  nextCallOf,
  participantsText,
  toLocalInput,
  upcomingOf,
} from '../lib/callRules.js'

const call = (id, project, status, scheduled_for = null) => ({ id, project, status, scheduled_for })

test('chamada em andamento e agendadas por projeto', () => {
  const calls = [
    call(1, 7, 'scheduled', '2030-01-02T10:00:00Z'),
    call(2, 7, 'scheduled', '2030-01-01T10:00:00Z'),
    call(3, 8, 'live'),
    call(4, 7, 'live'),
  ]

  assert.equal(liveCallOf(calls, 7).id, 4)
  assert.equal(liveCallOf(calls, 9), null)
  assert.deepEqual(
    upcomingOf(calls, 7).map((item) => item.id),
    [2, 1],
  )
  assert.equal(nextCallOf(calls, 7).id, 4)
  assert.equal(
    nextCallOf(
      calls.filter((item) => item.status !== 'live'),
      7,
    ).id,
    2,
  )
  assert.equal(nextCallOf([], 7), null)
})

test('hora chegou: só agendada com data passada', () => {
  const now = Date.parse('2030-01-01T12:00:00Z')

  assert.equal(isDue(call(1, 1, 'scheduled', '2030-01-01T11:59:00Z'), now), true)
  assert.equal(isDue(call(1, 1, 'scheduled', '2030-01-01T12:01:00Z'), now), false)
  assert.equal(isDue(call(1, 1, 'live', '2030-01-01T11:00:00Z'), now), false)
  assert.equal(isDue(call(1, 1, 'scheduled', null), now), false)
})

test('aplica evento call.changed sem alterar a lista original', () => {
  const original = [call(1, 1, 'scheduled', '2030-01-01T10:00:00Z')]
  const live = { ...original[0], status: 'live' }
  const added = applyCallChange(original, call(2, 1, 'live'))

  assert.equal(original.length, 1)
  assert.deepEqual(added.map((item) => item.id).sort(), [1, 2])
  assert.equal(applyCallChange(original, live)[0].status, 'live')
  assert.deepEqual(
    applyCallChange(added, call(2, 1, 'ended')).map((item) => item.id),
    [1],
  )
  assert.deepEqual(
    applyCallChange(added, call(1, 1, 'scheduled'), true).map((item) => item.id),
    [2],
  )
})

test('textos de participantes e tempo decorrido', () => {
  assert.equal(participantsText(0), 'Ninguém entrou ainda')
  assert.equal(participantsText(1), '1 pessoa na chamada')
  assert.equal(participantsText(4), '4 pessoas na chamada')
  assert.equal(formatElapsed(5), '0:05')
  assert.equal(formatElapsed(65), '1:05')
  assert.equal(formatElapsed(3725), '1:02:05')
  assert.equal(formatElapsed(-3), '0:00')
})

test('conversão de data local <-> ISO', () => {
  const local = '2030-05-04T09:30'

  assert.equal(toLocalInput(fromLocalInput(local)), local)
  assert.equal(fromLocalInput(''), null)
  assert.equal(fromLocalInput('lixo'), null)
  assert.equal(toLocalInput('lixo'), '')
})

test('tempo até a hora marcada', () => {
  const now = Date.parse('2030-01-01T12:00:00Z')

  assert.equal(msUntil(call(1, 1, 'scheduled', '2030-01-01T12:00:05Z'), now), 5000)
  assert.equal(msUntil(call(1, 1, 'scheduled', '2030-01-01T11:00:00Z'), now), 0)
  assert.equal(msUntil(call(1, 1, 'scheduled', null), now), null)
})
