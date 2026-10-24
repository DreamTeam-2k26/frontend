const pad = (value) => String(value).padStart(2, '0')

// Datas de calendário são locais: nunca usar toISOString() para um dia sem horário.
export function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return null
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1000 || year > 9999) return null
  const date = new Date(year, month - 1, day, 12)
  return dateKey(date) === value ? date : null
}

export function monthDays(year, month) {
  const first = new Date(year, month, 1, 12)
  const offset = (first.getDay() + 6) % 7
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(year, month, 1 - offset + index, 12)
    return { key: dateKey(day), day: day.getDate(), outside: day.getMonth() !== month }
  })
}

export function withinDays(day, min = '', max = '') {
  return (
    Boolean(parseDay(day)) && (!min || day >= min.slice(0, 10)) && (!max || day <= max.slice(0, 10))
  )
}

// Link de evento avulso; o usuário confirma no Google. Não exige OAuth nem sincroniza agendas.
// https://developers.google.com/workspace/calendar/api/concepts/inviting-attendees-to-events
export function googleCalendarUrl({
  start,
  title = 'Compromisso no Fluxo',
  description = '',
  duration = 60,
} = {}) {
  if (typeof start !== 'string' || !start) return ''
  let dates
  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    const day = parseDay(start)
    if (!day) return ''
    const end = new Date(day)
    end.setDate(end.getDate() + 1)
    dates = `${start.replaceAll('-', '')}/${dateKey(end).replaceAll('-', '')}`
  } else {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(start) || !parseDay(start.slice(0, 10))) return ''
    const [hour, minute] = start.slice(11, 16).split(':').map(Number)
    if (hour > 23 || minute > 59) return ''
    const date = new Date(start)
    if (!Number.isFinite(date.getTime()) || !Number.isFinite(duration) || duration <= 0) return ''
    const stamp = (value) =>
      value
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '')
    const end = new Date(date.getTime() + duration * 60000)
    if (!Number.isFinite(end.getTime())) return ''
    dates = `${stamp(date)}/${stamp(end)}`
  }
  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: title.trim() || 'Compromisso no Fluxo',
    dates,
    details: description,
  })
  return `https://calendar.google.com/calendar/r/eventedit?${query}`
}
