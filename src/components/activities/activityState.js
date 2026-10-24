export const activityFilters = [
  { value: 'all', label: 'Todos os registros' },
  { value: 'tasks', label: 'Tarefas' },
  { value: 'members', label: 'Participantes' },
  { value: 'files', label: 'Arquivos' },
  { value: 'other', label: 'Outros registros' },
]
const normalizedType = (value) =>
  String(value || '')
    .toLowerCase()
    .replaceAll('.', '_')
export function activityCategory(activity) {
  const target = String(activity.target_type || '').toLowerCase()
  const event = normalizedType(activity.event_type)
  if (target === 'task' || event.startsWith('task_')) return 'tasks'
  if (target === 'file' || event.startsWith('file_')) return 'files'
  if (['member', 'membership'].includes(target) || /^(member|membership)_/.test(event))
    return 'members'
  return 'other'
}
export const categoryLabel = (activity) =>
  activityFilters.find((filter) => filter.value === activityCategory(activity))?.label ||
  'Atividade'
export function actorName(activity) {
  if (activity.actor == null) return 'Autor não informado'
  return typeof activity.actor === 'object'
    ? activity.actor.name || 'Participante'
    : activity.actor_name || 'Participante'
}
export function activityTarget(activity) {
  if (
    /(^|_)(deleted|removed|excluded|delete|remove)(_|$)/.test(normalizedType(activity.event_type))
  )
    return null
  const type = String(activity.target_type || '').toLowerCase()
  if (!['task', 'file'].includes(type) || !/^[1-9]\d*$/.test(String(activity.target_id || '')))
    return null
  return { type, id: String(activity.target_id) }
}
export function targetRoute(activity, project, entity) {
  const target = activityTarget(activity)
  if (!target || String(entity?.project) !== String(project) || String(entity.id) !== target.id)
    return null
  if (target.type === 'task')
    return { name: 'project-kanban', params: { id: project }, query: { task: target.id } }
  return { name: 'project-folders', params: { id: project, folderId: entity.folder ?? undefined } }
}
export function filterActivities(items, filter) {
  return filter === 'all' ? items : items.filter((item) => activityCategory(item) === filter)
}
export function orderActivities(items) {
  return [...new Map(items.map((item) => [String(item.id), item])).values()].sort(
    (a, b) =>
      (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0) ||
      String(b.id).localeCompare(String(a.id), 'pt-BR', { numeric: true }),
  )
}
export function activityDay(value) {
  return Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Data não informada'
}
export function activityTime(value) {
  return Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : 'Horário não informado'
}
export function activityError(error) {
  const status = error?.response?.status
  if (status === 401) return 'Sua sessão expirou. Entre novamente para consultar os registros.'
  if (status === 403) return 'Você não tem permissão para consultar os registros deste projeto.'
  if (status === 404) return 'O projeto não existe ou não está disponível para sua conta.'
  if (status >= 500) return 'O servidor não conseguiu carregar os registros. Tente novamente.'
  return 'Não foi possível carregar os registros. Verifique sua conexão e tente novamente.'
}
