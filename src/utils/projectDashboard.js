// Indicadores da Visão geral do projeto (GET /projects/{id}/dashboard/). Os números vêm prontos do
// backend: aqui só traduzimos os nomes e recusamos respostas inválidas (nada de métrica inventada).

const count = (value) => (Number.isInteger(value) && value >= 0 ? value : null)

export function toMetrics(data) {
  if (!data || typeof data !== 'object') return null
  const total = count(data.total_tasks)
  const done = count(data.done_tasks)
  const todo = count(data.todo_tasks)
  const inProgress = count(data.in_progress_tasks)
  const overdue = count(data.overdue_tasks)
  if ([total, done, todo, inProgress, overdue].includes(null)) return null

  // Regras da API: pendentes = total - concluídas; progresso de 0 a 100 (0 sem tarefas).
  const pending = count(data.pending_tasks) ?? total - done
  const progress = Number.isFinite(data.progress)
    ? Math.min(100, Math.max(0, Math.round(data.progress)))
    : 0
  return { total, done, pending, todo, inProgress, overdue, progress }
}

// Próximas entregas: junta as listas (a fazer e em andamento) pelo prazo mais próximo.
export function mergeUpcoming(lists, limit) {
  const byId = new Map()
  for (const task of lists.flat()) byId.set(task.id, task)
  return [...byId.values()]
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)) || a.id - b.id)
    .slice(0, limit)
}
