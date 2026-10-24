// Formatação de datas, tamanhos e nomes para a interface do chat.

const LOCALE = 'pt-BR'

function toDate(value) {
  if (value === null || value === undefined || value === '') return null

  const date = value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

/** Início do dia local (para comparar "hoje"/"ontem"). */
function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** "14:05" */
export function formatTime(value) {
  const date = toDate(value)

  return date ? date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' }) : ''
}

/** "Hoje", "Ontem" ou "23 de out. de 2026". */
export function formatDay(value, now = new Date()) {
  const date = toDate(value)

  if (!date) return ''

  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)

  if (days === 0) return 'Hoje'
  if (days === 1) return 'Ontem'

  return date.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Rótulo curto para a lista de salas: hora se for hoje, "Ontem" ou dd/mm. */
export function formatListTime(value, now = new Date()) {
  const date = toDate(value)

  if (!date) return ''

  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)

  if (days === 0) return formatTime(date)
  if (days === 1) return 'Ontem'

  return date.toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit' })
}

/** Chave estável do dia (para agrupar mensagens). */
export function dayKey(value) {
  const date = toDate(value)

  return date ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}` : ''
}

/** "1,2 MB" */
export function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }

  return `${value.toLocaleString(LOCALE, { maximumFractionDigits: 1 })} ${units[unit]}`
}

/** Iniciais para o avatar quando não há foto. */
export function initials(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean)

  if (!parts.length) return '?'

  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

/** Última vez visto: "visto hoje às 14:05", "visto ontem às ...", "visto em 20/10". */
export function formatLastSeen(value, now = new Date()) {
  const date = toDate(value)

  if (!date) return 'offline'

  const label = formatListTime(date, now)

  return label.includes(':') ? `visto hoje às ${label}` : `visto ${label.toLowerCase()}`
}

/** Prévia curta de uma mensagem (lista de salas e notificações): texto, "Foto" ou nome do arquivo. */
export function messagePreview(message) {
  if (!message) return ''
  if (message.is_deleted) return 'Mensagem apagada'
  if (message.body) return message.body
  if (message.file) return message.file.is_image ? '📷 Foto' : `📎 ${message.file.name}`

  return ''
}
