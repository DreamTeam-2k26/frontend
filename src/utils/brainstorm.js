// Regras puras do Brainstorm (sem Vue, testáveis com node --test). O backend é quem autoriza de verdade:
// aqui só decidimos o que mostrar para não oferecer ações que vão falhar.

export const CATEGORY_OPTIONS = [
  { value: 'ideas', label: 'Ideias' },
  { value: 'questions', label: 'Dúvidas' },
  { value: 'planning', label: 'Planejamento' },
  { value: 'decisions', label: 'Decisões' },
]

export const STATUS_OPTIONS = [
  { value: 'open', label: 'Em discussão' },
  { value: 'closed', label: 'Encerrada' },
  { value: 'decided', label: 'Decidida' },
  { value: 'archived', label: 'Arquivada' },
]

export const ORDER_OPTIONS = [
  { value: '-created_at', label: 'Mais recentes' },
  { value: '-score', label: 'Mais votadas' },
  { value: '-replies_count', label: 'Mais comentadas' },
]

export const PRIORITY_OPTIONS = [
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
]

export const TITLE_MAX = 150
export const REPLY_MAX = 5000
export const TASK_TITLE_MAX = 200

const labelOf = (options) => (value) =>
  options.find((option) => option.value === value)?.label ?? value

export const categoryLabel = labelOf(CATEGORY_OPTIONS)
export const statusLabel = labelOf(STATUS_OPTIONS)
export const priorityLabel = labelOf(PRIORITY_OPTIONS)

const MANAGER_ROLES = new Set(['owner', 'admin'])

// O que a tela pode oferecer para este usuário nesta discussão.
export function topicFlags(topic, { role, userId }) {
  const status = topic?.status
  const isManager = MANAGER_ROLES.has(role)
  const isOpen = status === 'open'
  const isAuthor = topic?.author != null && topic.author === userId
  // Excluir só sem interações; o ciclo > 1 indica que já houve encerramento (pode ter análise).
  const untouched =
    !topic?.replies_count &&
    !topic?.upvotes &&
    !topic?.downvotes &&
    !topic?.current_decision &&
    topic?.cycle === 1

  return {
    isManager,
    isOpen,
    isAuthor,
    readOnly: !isOpen,
    inReview: Boolean(topic?.in_review),
    canVote: isOpen,
    canReply: isOpen,
    canEdit: isOpen && isAuthor,
    canDelete: isOpen && untouched && (isAuthor || isManager),
    canClose: isManager && isOpen,
    canReopen: isManager && (status === 'closed' || status === 'decided'),
    canArchive: isManager && Boolean(status) && status !== 'archived',
    canAnalyze: isManager && status === 'closed',
    canApprove: isManager && status === 'closed',
  }
}

// Respostas encadeadas: [{ reply, children }] em ordem de criação. Pai que não veio vira raiz.
export function buildThread(replies) {
  const nodes = new Map(replies.map((reply) => [reply.id, { reply, children: [] }]))
  const roots = []
  for (const reply of replies) {
    const node = nodes.get(reply.id)
    const parent = reply.parent != null ? nodes.get(reply.parent) : null
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

const allowed = (options, value) => (options.some((option) => option.value === value) ? value : '')

// Query da URL (busca, categoria, status, ordem) ↔ filtros da API.
export function normalizeListQuery(query = {}) {
  return {
    search: String(query.busca ?? '').trim(),
    category: allowed(CATEGORY_OPTIONS, query.categoria),
    status: allowed(STATUS_OPTIONS, query.status),
    ordering: allowed(ORDER_OPTIONS, query.ordem) || ORDER_OPTIONS[0].value,
  }
}

export function listQueryToRoute({ search, category, status, ordering }) {
  return {
    busca: search || undefined,
    categoria: category || undefined,
    status: status || undefined,
    ordem: ordering && ordering !== ORDER_OPTIONS[0].value ? ordering : undefined,
  }
}

// Cards editáveis da decisão, um por sugestão da IA. Começam desmarcados: nada é criado sem escolha.
export function cardsFromAnalysis(result) {
  return (result?.task_suggestions ?? []).map((suggestion, index) => ({
    key: `s${index}`,
    suggestionIndex: index,
    selected: false,
    mode: suggestion.existing_task_id ? 'existing' : 'new',
    existingTaskId: suggestion.existing_task_id ?? null,
    title: suggestion.title ?? '',
    description: suggestion.description ?? '',
    priority: suggestion.priority || 'medium',
    assignee: null,
    dueDate: '',
    sources: suggestion.sources ?? [],
  }))
}

// Corpo do POST approve/ só com os cards marcados.
export function approvalPayload({ analysisId, text, justification, cards }) {
  const tasks = cards
    .filter((card) => card.selected)
    .map((card) => {
      const index = card.suggestionIndex != null ? { suggestion_index: card.suggestionIndex } : {}
      if (card.mode === 'existing') return { ...index, existing_task_id: card.existingTaskId }
      return {
        ...index,
        title: card.title.trim(),
        description: card.description.trim(),
        priority: card.priority,
        assignee: card.assignee ?? null,
        due_date: card.dueDate || null,
      }
    })
  return { analysis: analysisId, text: text.trim(), justification: justification.trim(), tasks }
}

// Prévia do contexto no card da lista: corta na última palavra inteira.
export function preview(text, max = 160) {
  const value = String(text ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  if (value.length <= max) return value
  const cut = value.slice(0, max + 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > 0 ? cut.slice(0, space) : value.slice(0, max)).trimEnd()}…`
}

export function formatWhen(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

// O backend grava created_at e updated_at com milissegundos de diferença na criação: só conta como
// editada a alteração feita depois de alguns segundos.
export function wasEdited(item, toleranceMs = 2000) {
  const created = Date.parse(item?.created_at)
  const updated = Date.parse(item?.updated_at)
  return Number.isFinite(created) && Number.isFinite(updated) && updated - created > toleranceMs
}
