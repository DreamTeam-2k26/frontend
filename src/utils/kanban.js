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
    if (search && !normalize(task.title).includes(search)) return false
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
