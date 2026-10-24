import { filterTasks, todayISO } from './kanban.js'

export function daysInMonth(year, month) {
  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}
export function validMonth(value) {
  return typeof value === 'string' && /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value)
}
export function validDate(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !validMonth(value.slice(0, 7))
  )
    return false
  const [year, month, day] = value.split('-').map(Number)
  return day >= 1 && day <= daysInMonth(year, month)
}
// Nunca interpreta YYYY-MM-DD como timestamp UTC. Meio-dia local evita transições de meia-noite.
export function localDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(2000, 0, 1, 12)
  date.setFullYear(year, month - 1, day)
  return date
}
export function shiftMonth(month, offset) {
  const [year, number] = month.split('-').map(Number)
  const index = Math.min(10000 * 12 - 1, Math.max(12, year * 12 + number - 1 + offset))
  return `${String(Math.floor(index / 12)).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`
}
export function shiftDay(value, offset) {
  const date = localDate(value)
  date.setDate(date.getDate() + offset)
  const result = todayISO(date)
  return validDate(result) ? result : value
}
export function monthLabel(month) {
  return localDate(`${month}-01`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
export function dayLabel(day) {
  return localDate(day).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
export function monthDays(month) {
  const [year, number] = month.split('-').map(Number)
  const offset = localDate(`${month}-01`).getDay()
  const count = daysInMonth(year, number)
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1
    return day >= 1 && day <= count ? `${month}-${String(day).padStart(2, '0')}` : null
  })
}
export function calendarTasks(tasks, month, filters) {
  return filterTasks(tasks, filters)
    .filter((task) => validDate(task.due_date) && task.due_date.startsWith(`${month}-`))
    .sort(
      (a, b) =>
        a.due_date.localeCompare(b.due_date) ||
        a.title.localeCompare(b.title, 'pt-BR') ||
        a.id - b.id,
    )
}
export function isCalendarOverdue(task, columns, today) {
  return (
    validDate(task.due_date) &&
    task.due_date < today &&
    !task.completed_at &&
    columns.get(String(task.column))?.category !== 'done'
  )
}
export function calendarTaskRoute(projectId, taskId) {
  return { name: 'project-kanban', params: { id: projectId }, query: { task: String(taskId) } }
}
