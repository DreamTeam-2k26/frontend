import { shiftDay, validDate } from './calendar.js'

export function deadlineDates(dueDate) {
  if (!validDate(dueDate)) return null
  const end = shiftDay(dueDate, 1)
  if (end === dueDate) return null
  return { start: dueDate.replaceAll('-', ''), end: end.replaceAll('-', '') }
}
export function googleCalendarUrl(task, taskUrl = '', projectName = '') {
  const dates = deadlineDates(task.due_date)
  if (!dates) return ''
  const url = new URL('https://calendar.google.com/calendar/r/eventedit')
  url.search = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Prazo: ${task.title}`,
    dates: `${dates.start}/${dates.end}`,
    details: [
      projectName && `Projeto: ${projectName}`,
      'Prazo final de uma tarefa do Fluxo. Consulte a tarefa para acompanhar alterações.',
      taskUrl,
    ]
      .filter(Boolean)
      .join('\n'),
  }).toString()
  return url.toString()
}
const escapeText = (value) =>
  String(value ?? '')
    .replaceAll('\\', '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
// RFC 5545: dobra linhas em até 75 octetos, preservando caracteres UTF-8.
function fold(line) {
  const lines = []
  let current = '',
    bytes = 0
  for (const character of line) {
    const size = new TextEncoder().encode(character).length
    if (bytes + size > 75) {
      lines.push(current)
      current = ' '
      bytes = 1
    }
    current += character
    bytes += size
  }
  lines.push(current)
  return lines.join('\r\n')
}
export function deadlinesIcs(
  tasks,
  { projectId, projectName = '', taskUrl = () => '', now = new Date() } = {},
) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fluxo//Prazos de tarefas//PT-BR',
    'CALSCALE:GREGORIAN',
  ]
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
  for (const task of tasks) {
    const dates = deadlineDates(task.due_date)
    if (!dates) continue
    lines.push(
      'BEGIN:VEVENT',
      `UID:project-${projectId}-task-${task.id}@fluxo`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dates.start}`,
      `DTEND;VALUE=DATE:${dates.end}`,
      `SUMMARY:${escapeText(`Prazo: ${task.title}`)}`,
      `DESCRIPTION:${escapeText([projectName && `Projeto: ${projectName}`, 'Prazo final no Fluxo. Alterações devem ser conferidas na tarefa.', taskUrl(task.id)].filter(Boolean).join('\n'))}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

// Reuniões têm horário real; usa UTC no link para conservar o instante em qualquer fuso.
export function meetingCalendarUrl(call, callUrl = '', projectName = '') {
  if (call.status !== 'scheduled' || !call.scheduled_for) return ''
  const start = new Date(call.scheduled_for)
  if (Number.isNaN(start.getTime())) return ''
  // A API não fornece duração. A pessoa pode ajustar a sugestão no Google antes de salvar.
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const format = (date) =>
    date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')
  const url = new URL('https://calendar.google.com/calendar/r/eventedit')
  url.search = new URLSearchParams({
    action: 'TEMPLATE',
    text: call.title || 'Reunião do projeto',
    dates: `${format(start)}/${format(end)}`,
    details: [
      projectName && `Projeto: ${projectName}`,
      'Reunião no Fluxo. Duração sugerida: 1 hora; revise antes de salvar. Confira alterações de horário no Fluxo.',
      callUrl,
    ]
      .filter(Boolean)
      .join('\n'),
  }).toString()
  return url.toString()
}
