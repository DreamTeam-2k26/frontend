import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  calendarTaskRoute,
  calendarTasks,
  daysInMonth,
  isCalendarOverdue,
  localDate,
  monthDays,
  monthLabel,
  shiftDay,
  shiftMonth,
  validDate,
  validMonth,
} from '../../src/utils/calendar.js'

test('meses, anos bissextos e virada de ano não perdem dias', () => {
  assert.equal(daysInMonth(2024, 2), 29)
  assert.equal(daysInMonth(2100, 2), 28)
  assert.equal(daysInMonth(2000, 2), 29)
  assert.equal(shiftMonth('2026-12', 1), '2027-01')
  assert.equal(shiftMonth('2027-01', -1), '2026-12')
  assert.equal(shiftMonth('0001-01', -1), '0001-01')
  assert.equal(shiftMonth('9999-12', 1), '9999-12')
  assert.equal(shiftDay('2026-12-31', 1), '2027-01-01')
  assert.equal(shiftDay('2024-03-01', -1), '2024-02-29')
  assert.equal(monthDays('2024-02').filter(Boolean).length, 29)
  assert.equal(monthDays('2026-11')[0], '2026-11-01')
  assert.equal(monthDays('2026-10')[4], '2026-10-01')
  assert.match(monthLabel('2026-10'), /outubro.*2026/)
})
test('prazo é data local, sem interpretação UTC, e entradas inválidas são ignoradas', () => {
  for (const day of ['2026-01-01', '2026-10-24', '2024-02-29', '0099-01-01']) {
    const date = localDate(day)
    assert.equal(date.getDate(), Number(day.slice(-2)))
    assert.equal(date.getMonth() + 1, Number(day.slice(5, 7)))
    assert.equal(date.getFullYear(), Number(day.slice(0, 4)))
  }
  for (const value of [
    null,
    [],
    '',
    '2026-1-01',
    '2026-02-29',
    '2026-04-31',
    '0000-01-01',
    '2026-10-24T00:00:00Z',
  ])
    assert.equal(validDate(value), false)
  assert.equal(validMonth('2026-13'), false)
})
const task = (id, fields = {}) => ({
  id,
  title: `Tarefa ${id}`,
  due_date: '2026-10-24',
  column: 1,
  assignee: null,
  ...fields,
})
test('filtros reutilizados de status/responsável e apenas tarefas com prazo no mês', () => {
  const tasks = [
    task(1),
    task(2, { assignee: 7 }),
    task(3, { due_date: null }),
    task(4, { column: 2 }),
    task(5, { due_date: '2026-11-01' }),
    task(6, { due_date: '2026-10-32' }),
  ]
  assert.deepEqual(
    calendarTasks(tasks, '2026-10', {}).map((t) => t.id),
    [1, 2, 4],
  )
  assert.deepEqual(
    calendarTasks(tasks, '2026-10', { assignee: '7' }).map((t) => t.id),
    [2],
  )
  assert.deepEqual(
    calendarTasks(tasks, '2026-10', { assignee: 'none', column: '1' }).map((t) => t.id),
    [1],
  )
  assert.equal(tasks.length, 6)
})
test('atraso ignora concluídas e hoje; card leva ao detalhe real no Kanban', () => {
  const columns = new Map([
    ['1', { category: 'todo' }],
    ['2', { category: 'done' }],
  ])
  assert.equal(isCalendarOverdue(task(1), columns, '2026-10-25'), true)
  assert.equal(isCalendarOverdue(task(1), columns, '2026-10-24'), false)
  assert.equal(isCalendarOverdue(task(1, { column: 2 }), columns, '2026-10-25'), false)
  assert.equal(
    isCalendarOverdue(task(1, { completed_at: '2026-10-23' }), columns, '2026-10-25'),
    false,
  )
  assert.deepEqual(calendarTaskRoute(7, 12), {
    name: 'project-kanban',
    params: { id: 7 },
    query: { task: '12' },
  })
})
