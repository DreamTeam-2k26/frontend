// Regras e textos das chamadas (sem Vue nem navegador: testável com node --test).

export const STATUS = Object.freeze({ SCHEDULED: 'scheduled', LIVE: 'live', ENDED: 'ended' })

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

/** "sex., 23 de out., 20:30" a partir de um ISO 8601; vazio se inválido. */
export function formatWhen(iso) {
  const date = new Date(iso)

  return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date).replace(/\./g, '')
}

/** Valor para <input type="datetime-local"> (horário local) a partir de um ISO ou Date. */
export function toLocalInput(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  const pad = (n) => String(n).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** ISO 8601 (UTC) a partir do valor de um <input type="datetime-local">; null se vazio/inválido. */
export function fromLocalInput(value) {
  if (!value) return null

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export const isLive = (call) => call?.status === STATUS.LIVE
export const isScheduled = (call) => call?.status === STATUS.SCHEDULED

/** Agendada cuja hora já chegou (ainda não iniciada). */
export function isDue(call, now = Date.now()) {
  return isScheduled(call) && !!call.scheduled_for && new Date(call.scheduled_for).getTime() <= now
}

/** Chamada em andamento de um projeto (há no máximo uma). */
export function liveCallOf(calls, projectId) {
  return calls.find((call) => call.project === projectId && isLive(call)) ?? null
}

/** Agendadas de um projeto, da mais próxima para a mais distante. */
export function upcomingOf(calls, projectId) {
  return calls
    .filter((call) => call.project === projectId && isScheduled(call))
    .sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for))
}

/** Próxima reunião a mostrar no projeto: a em andamento ou a agendada mais próxima. */
export function nextCallOf(calls, projectId) {
  return liveCallOf(calls, projectId) ?? upcomingOf(calls, projectId)[0] ?? null
}

/** "3 pessoas na chamada", "1 pessoa na chamada", "Ninguém entrou ainda". */
export function participantsText(count) {
  if (!count) return 'Ninguém entrou ainda'

  return count === 1 ? '1 pessoa na chamada' : `${count} pessoas na chamada`
}

/** Aplica um evento `call.changed` na lista (adiciona, troca ou remove). Não altera a lista recebida. */
export function applyCallChange(calls, call, removed = false) {
  const others = calls.filter((item) => item.id !== call.id)

  if (removed || call.status === STATUS.ENDED) return others

  return [...others, call]
}

/** Segundos desde o início → "12:05" ou "1:02:05". */
export function formatElapsed(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n) => String(n).padStart(2, '0')

  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** Em quantos ms a hora agendada chega (0 se já passou; null se não há data). */
export function msUntil(call, now = Date.now()) {
  if (!call?.scheduled_for) return null

  return Math.max(0, new Date(call.scheduled_for).getTime() - now)
}
