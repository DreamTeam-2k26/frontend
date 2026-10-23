// Regras puras do quadro Kanban (sem Vue, testáveis com node --test).

export const PRIORITIES = [
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
]

export const CATEGORIES = [
  { value: 'todo', label: 'A fazer' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'done', label: 'Concluído' },
]

export const EMPTY_FILTERS = Object.freeze({
  search: '',
  priority: '',
  assignee: '', // '' | 'none' | id do usuário
  column: '',
  due: '', // '' | 'overdue' | 'no_date'
})

const MANAGERS = new Set(['owner', 'admin'])
const DAY_MS = 24 * 60 * 60 * 1000
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function sortByPosition(items) {
  return [...items].sort(
    (a, b) =>
      a.position - b.position ||
      String(a.id).localeCompare(String(b.id), undefined, { numeric: true }),
  )
}

export function groupTasks(columns, tasks) {
  const groups = new Map(columns.map((column) => [column.id, []]))
  for (const task of tasks) groups.get(task.column)?.push(task)
  for (const [id, list] of groups) groups.set(id, sortByPosition(list))
  return groups
}

const normalize = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()

export function hasActiveFilters(filters) {
  return Object.entries(filters).some(
    ([key, value]) => (key === 'search' ? normalize(value) : value) !== '',
  )
}

export function filterTasks(tasks, filters, { columnsById } = {}) {
  const search = normalize(filters.search)
  return tasks.filter((task) => {
    if (search && !normalize(`${task.title} ${task.description ?? ''}`).includes(search))
      return false
    if (filters.priority && task.priority !== filters.priority) return false
    if (filters.assignee === 'none' && task.assignee != null) return false
    if (
      filters.assignee &&
      filters.assignee !== 'none' &&
      String(task.assignee) !== String(filters.assignee)
    )
      return false
    if (filters.column && String(task.column) !== String(filters.column)) return false
    if (filters.due === 'overdue' && !task.is_overdue) return false
    if (filters.due === 'no_date' && task.due_date) return false
    if (filters.category && columnsById?.get(task.column)?.category !== filters.category)
      return false
    return true
  })
}

// Índice de inserção na lista visível (sem a tarefa movida) → posição real na coluna completa
// (também sem a tarefa movida). Com filtro ativo, mantém a ordem dos cards ocultos.
export function targetPosition(fullColumnTasks, visibleColumnTasks, visibleIndex, movingId) {
  const full = fullColumnTasks.filter((task) => task.id !== movingId)
  const visible = visibleColumnTasks.filter((task) => task.id !== movingId)
  if (!visible.length) return full.length
  if (visibleIndex < visible.length) {
    return full.findIndex((task) => task.id === visible[visibleIndex].id)
  }
  return full.findIndex((task) => task.id === visible[visible.length - 1].id) + 1
}

// Resposta de POST /tasks/{id}/move/: tarefas das colunas afetadas, já na ordem nova.
export function applyMoveResult(tasks, movedTasks) {
  const affectedColumns = new Set(movedTasks.map((task) => task.column))
  const movedIds = new Set(movedTasks.map((task) => task.id))
  return [
    ...tasks.filter((task) => !affectedColumns.has(task.column) && !movedIds.has(task.id)),
    ...movedTasks,
  ]
}

export const canManageColumns = (role) => MANAGERS.has(role)
export const canEditComment = (comment, userId) =>
  comment.author != null && comment.author === userId
export const canDeleteComment = (comment, userId, role) =>
  canEditComment(comment, userId) || MANAGERS.has(role)

export function todayISO(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const toUTC = (iso) => {
  const [year, month, day] = iso.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

// Prazo para cards e detalhe: rótulo curto ("24 out"), texto relativo e tom visual.
export function dueInfo(dueDate, today, isDone = false) {
  if (!dueDate) return { label: '', relative: '', tone: 'none' }

  const [, month, day] = dueDate.split('-').map(Number)
  const label = `${day} ${MONTHS[month - 1]}`
  if (isDone) return { label, relative: '', tone: 'normal' }

  const days = Math.round((toUTC(dueDate) - toUTC(today)) / DAY_MS)
  if (days < 0) {
    const late = -days
    return { label, relative: `atrasada há ${late} ${late === 1 ? 'dia' : 'dias'}`, tone: 'late' }
  }
  const relative = days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days} dias`
  return { label, relative, tone: days <= 2 ? 'soon' : 'normal' }
}

export function checklistPercent(done, total) {
  return total ? Math.round((done / total) * 100) : 0
}

// Atualização otimista do arrasto: mesma regra do backend (insere e renumera 0, 1, 2... as colunas envolvidas).
export function moveLocally(tasks, taskId, columnId, position) {
  const moving = tasks.find((task) => task.id === taskId)
  if (!moving) return tasks

  const columnIds = new Set([moving.column, columnId])
  const target = sortByPosition(
    tasks.filter((task) => task.column === columnId && task.id !== taskId),
  )
  target.splice(Math.min(position, target.length), 0, { ...moving, column: columnId })
  const source =
    moving.column === columnId
      ? []
      : sortByPosition(tasks.filter((task) => task.column === moving.column && task.id !== taskId))

  const renumbered = [...source, ...target].map((task, index, list) => ({
    ...task,
    position: list.slice(0, index).filter((other) => other.column === task.column).length,
  }))
  return [...tasks.filter((task) => !columnIds.has(task.column)), ...renumbered]
}

// Tempo relativo dos comentários ("agora", "há 5 min", "ontem", "2 out").
export function timeAgo(iso, now = new Date()) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const minutes = Math.floor((now - date) / 60000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} h`

  const days = Math.round((toUTC(todayISO(now)) - toUTC(todayISO(date))) / DAY_MS)
  if (days === 1) return 'ontem'
  if (days < 7) return `há ${days} dias`
  const label = `${date.getDate()} ${MONTHS[date.getMonth()]}`
  return date.getFullYear() === now.getFullYear() ? label : `${label} ${date.getFullYear()}`
}

// Links de apoio: o backend só aceita http/https (evita javascript: e afins).
export function isHttpUrl(value) {
  try {
    return ['http:', 'https:'].includes(new URL(String(value).trim()).protocol)
  } catch {
    return false
  }
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

export const SORTS = [
  { value: 'manual', label: 'Manual' },
  { value: 'due', label: 'Prazo' },
  { value: 'priority', label: 'Prioridade' },
  { value: 'title', label: 'Título' },
  { value: 'recent', label: 'Mais recentes' },
]

export const GROUPS = [
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Prioridade' },
  { value: 'assignee', label: 'Responsável' },
]

// Ordem dos cards dentro de cada faixa. "manual" respeita coluna e posição gravadas no servidor.
export function sortTasks(tasks, sort = 'manual', { columnsById } = {}) {
  const manual = (a, b) =>
    (columnsById?.get(a.column)?.position ?? 0) - (columnsById?.get(b.column)?.position ?? 0) ||
    a.position - b.position ||
    a.id - b.id
  const compare =
    {
      manual,
      due: (a, b) =>
        (a.due_date ? 0 : 1) - (b.due_date ? 0 : 1) ||
        String(a.due_date ?? '').localeCompare(String(b.due_date ?? '')) ||
        manual(a, b),
      priority: (a, b) =>
        (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) || manual(a, b),
      title: (a, b) =>
        normalize(a.title).localeCompare(normalize(b.title), 'pt-BR') || manual(a, b),
      recent: (a, b) => b.id - a.id,
    }[sort] ?? manual
  return [...tasks].sort(compare)
}

// Faixas do quadro/lista conforme o agrupamento. Só "status" usa colunas reais (arrastar move de coluna);
// prioridade e responsável são faixas virtuais (soltar altera o campo da tarefa).
export function buildLanes(group, { columns, members, tasks, sort = 'manual' }) {
  const columnsById = new Map(columns.map((column) => [column.id, column]))
  const sorted = (list) => sortTasks(list, sort, { columnsById })

  if (group === 'priority') {
    return PRIORITIES.map((priority) => ({
      id: `priority-${priority.value}`,
      kind: 'priority',
      value: priority.value,
      title: priority.label,
      tone: priority.value,
      tasks: sorted(tasks.filter((task) => task.priority === priority.value)),
    }))
  }

  if (group === 'assignee') {
    const people = members.map((member) => ({
      value: member.user,
      title: member.user_name || member.user_email,
    }))
    // Responsável que saiu do projeto continua visível na própria faixa.
    for (const task of tasks) {
      if (task.assignee != null && !people.some((person) => person.value === task.assignee)) {
        people.push({ value: task.assignee, title: task.assignee_name || 'Ex-participante' })
      }
    }
    return [...people, { value: null, title: 'Sem responsável' }].map((person) => ({
      id: `assignee-${person.value ?? 'none'}`,
      kind: 'assignee',
      value: person.value,
      title: person.title,
      tone: person.value == null ? 'none' : 'person',
      tasks: sorted(tasks.filter((task) => (task.assignee ?? null) === person.value)),
    }))
  }

  return sortByPosition(columns).map((column) => ({
    id: `column-${column.id}`,
    kind: 'column',
    value: column.id,
    title: column.name,
    tone: column.category,
    column,
    tasks: sorted(tasks.filter((task) => task.column === column.id)),
  }))
}
