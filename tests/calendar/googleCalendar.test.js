import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deadlineDates, deadlinesIcs, googleCalendarUrl } from '../../src/utils/googleCalendar.js'

test('prazo é evento de dia inteiro com fim exclusivo, inclusive ano e fevereiro', () => {
  assert.deepEqual(deadlineDates('2026-12-31'), { start: '20261231', end: '20270101' })
  assert.deepEqual(deadlineDates('2024-02-29'), { start: '20240229', end: '20240301' })
  assert.equal(deadlineDates('2026-02-29'), null)
  assert.equal(deadlineDates(null), null)
  const url = new URL(
    googleCalendarUrl(
      { title: 'Revisão & entrega', due_date: '2026-10-24' },
      'https://fluxo.example/projects/7/kanban?task=3',
      'Equipe',
    ),
  )
  assert.equal(url.origin, 'https://calendar.google.com')
  assert.equal(url.searchParams.get('dates'), '20261024/20261025')
  assert.equal(url.searchParams.get('text'), 'Prazo: Revisão & entrega')
  assert.match(url.searchParams.get('details'), /task=3/)
  assert.equal(googleCalendarUrl({ due_date: null }), '')
})
test('ICS omite tarefas sem prazo, escapa conteúdo e conserva UTF-8/CRLF e UIDs', () => {
  const tasks = [
    { id: 1, title: 'Olá, equipe;\\ teste\nBEGIN:VEVENT', due_date: '2026-12-31' },
    { id: 2, title: 'Á'.repeat(100), due_date: '2024-02-29' },
    { id: 3, title: 'Sem prazo', due_date: null },
  ]
  const ics = deadlinesIcs(tasks, {
    projectId: 7,
    projectName: 'Equipe',
    taskUrl: (id) => `https://fluxo.example/projects/7/kanban?task=${id}`,
    now: new Date('2026-10-24T12:34:56Z'),
  })
  assert.equal(ics.split('\r\n').filter((line) => line === 'BEGIN:VEVENT').length, 2)
  assert.match(ics, /DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101/)
  assert.match(ics, /UID:project-7-task-1@fluxo/)
  assert.match(ics, /DTSTAMP:20261024T123456Z/)
  assert.doesNotMatch(ics, /Sem prazo/)
  assert.match(ics, /Olá\\, equipe\\;\\\\ teste\\nBEGIN:VEVENT/)
  assert.ok(ics.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75))
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'))
  assert.match(ics.replace(/\r\n /g, ''), new RegExp('Á'.repeat(100)))
})
