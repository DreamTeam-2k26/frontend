import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  dateKey,
  parseDay,
  monthDays,
  withinDays,
  googleCalendarUrl,
} from '../../src/utils/calendar.js'

test('datas civis: bissextos, datas inválidas e sem conversão para UTC', () => {
  assert.equal(dateKey(parseDay('2028-02-29')), '2028-02-29')
  for (const value of ['', '2026-02-29', '2026-04-31', '2026-13-01', '24/10/2026', '2026-1-01'])
    assert.equal(parseDay(value), null)
  assert.equal(dateKey(new Date(2026, 9, 24, 0, 1)), '2026-10-24')
})
test('grade começa na segunda-feira e atravessa virada de mês/ano', () => {
  const grid = monthDays(2027, 0)
  assert.equal(grid.length, 42)
  assert.equal(grid[0].key, '2026-12-28')
  assert.equal(grid[0].outside, true)
  assert.equal(grid.find((day) => day.key === '2027-01-01').outside, false)
  assert.equal(grid.at(-1).key, '2027-02-07')
  assert.equal(monthDays(2028, 1).filter((day) => !day.outside).length, 29)
})
test('limites de calendário são inclusivos, inclusive com data e hora', () => {
  assert.equal(withinDays('2026-10-24', '2026-10-24T12:00', '2026-10-25T15:00'), true)
  assert.equal(withinDays('2026-10-23', '2026-10-24'), false)
  assert.equal(withinDays('2026-10-26', '', '2026-10-25'), false)
  assert.equal(withinDays('2026-02-30'), false)
})
test('Google: prazo sem horário gera dia inteiro com fim exclusivo na virada do ano', () => {
  const url = new URL(
    googleCalendarUrl({
      start: '2026-12-31',
      title: 'Entrega & revisão',
      description: 'Itens: A/B? Sim #1',
    }),
  )
  assert.equal(url.origin, 'https://calendar.google.com')
  assert.equal(url.searchParams.get('action'), 'TEMPLATE')
  assert.equal(url.searchParams.get('dates'), '20261231/20270101')
  assert.equal(url.searchParams.get('text'), 'Entrega & revisão')
  assert.equal(url.searchParams.get('details'), 'Itens: A/B? Sim #1')
})
test('Google: horário com offset vira UTC, duração padrão de uma hora', () => {
  const url = new URL(googleCalendarUrl({ start: '2026-10-24T23:30:00-03:00' }))
  assert.equal(url.searchParams.get('dates'), '20261025T023000Z/20261025T033000Z')
})
test('Google: horário local preserva o instante da seleção, sem inventar fuso', () => {
  const value = '2026-10-24T14:25'
  const start = new Date(value)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
  const url = new URL(googleCalendarUrl({ start: value, duration: 30 }))
  assert.equal(url.searchParams.get('dates').split('/')[0], start)
})
test('Google: entradas ausentes ou inválidas nunca geram link quebrado', () => {
  for (const start of [
    '',
    null,
    10,
    '2026-02-30',
    'invalid',
    '2026-10-24T24:00',
    '2026-10-24T12:65',
  ])
    assert.equal(googleCalendarUrl({ start }), '')
  assert.equal(googleCalendarUrl({ start: '2026-10-24T12:00', duration: -1 }), '')
  assert.equal(googleCalendarUrl({ start: '2026-10-24T12:00', duration: 1e99 }), '')
})
