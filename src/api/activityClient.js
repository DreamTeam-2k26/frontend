import { loadProjectPages } from './projectPagination.js'
import {
  activityTarget,
  targetRoute,
  orderActivities,
} from '../components/activities/activityState.js'

const validDate = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value))
const sameProject = (item, project) => String(item.project) === String(project)
const sourceLabels = { tasks: 'tarefas', files: 'arquivos', memberships: 'participantes' }

// Resumo dos registros atuais. Nenhum evento de edição, exclusão ou movimentação é inferido.
export function createActivityClient(api) {
  async function listSource(resource, project, signal) {
    const records = await loadProjectPages(async (page) => {
      signal?.throwIfAborted()
      const { data } = await api.get(`/${resource}/`, {
        params: { project, page, page_size: 100 },
        signal,
      })
      return data
    })
    if (records.some((item) => !sameProject(item, project))) throw new Error('Projeto divergente')
    return records
  }
  return {
    async list(project, { signal } = {}) {
      if (!/^[1-9]\d*$/.test(String(project)))
        throw Object.assign(new Error('Projeto inválido'), { response: { status: 404 } })
      // Não interpretar listas vazias de um projeto alheio como ausência de registros.
      const { data: currentProject } = await api.get(`/projects/${encodeURIComponent(project)}/`, {
        signal,
      })
      if (String(currentProject.id) !== String(project)) throw new Error('Projeto divergente')
      const resources = ['tasks', 'files', 'memberships']
      const results = await Promise.allSettled(
        resources.map((resource) => listSource(resource, project, signal)),
      )
      signal?.throwIfAborted()
      const accessError = results.find(
        (result) =>
          result.status === 'rejected' && [401, 403].includes(result.reason.response?.status),
      )
      if (accessError) throw accessError.reason
      const items = [],
        warnings = []
      let taskFailures = 0,
        missingDates = 0
      const make = (type, entity, date, actor, actorName, summary) => {
        if (!validDate(date)) {
          missingDates++
          return
        }
        const record = {
          id: `${type}:${entity.id}`,
          project: entity.project,
          event_type:
            type === 'task'
              ? 'task_created'
              : type === 'file'
                ? 'file_uploaded'
                : 'membership_joined',
          target_type: type,
          target_id: entity.id,
          created_at: date,
          actor: actor == null ? null : { id: actor, name: actorName || 'Participante' },
          summary,
        }
        record.destination = targetRoute(record, project, entity)
        items.push(record)
      }
      const taskResult = results[0]
      if (taskResult.status === 'fulfilled') {
        const tasks = taskResult.value
        let index = 0
        // A listagem atual não inclui criação/autoria. Consultar detalhes com concorrência limitada.
        await Promise.all(
          Array.from({ length: Math.min(4, tasks.length) }, async () => {
            while (index < tasks.length) {
              signal?.throwIfAborted()
              const task = tasks[index++]
              try {
                const entity = validDate(task.created_at)
                  ? task
                  : (await api.get(`/tasks/${encodeURIComponent(task.id)}/`, { signal })).data
                if (!sameProject(entity, project) || String(entity.id) !== String(task.id))
                  throw new Error('Projeto divergente')
                make(
                  'task',
                  entity,
                  entity.created_at,
                  entity.created_by,
                  entity.created_by_name,
                  `Tarefa criada: ${entity.title || 'Sem título'}`,
                )
              } catch (cause) {
                if (signal?.aborted || [401, 403].includes(cause.response?.status)) throw cause
                taskFailures++
              }
            }
          }),
        )
      }
      if (results[1].status === 'fulfilled')
        for (const file of results[1].value)
          make(
            'file',
            file,
            file.uploaded_at,
            file.uploaded_by,
            file.uploaded_by_name,
            `Arquivo enviado: ${file.name || 'Sem nome'}`,
          )
      if (results[2].status === 'fulfilled')
        for (const member of results[2].value)
          make(
            'membership',
            member,
            member.joined_at,
            member.user,
            member.user_name,
            'Passou a participar do projeto.',
          )
      for (let i = 0; i < results.length; i++)
        if (results[i].status === 'rejected')
          warnings.push(
            `Não foi possível consultar ${sourceLabels[resources[i]]}. Atualize para tentar novamente.`,
          )
      if (taskFailures)
        warnings.push(
          `Não foi possível consultar os detalhes de ${taskFailures} tarefa(s). Elas podem ter sido removidas; atualize para tentar novamente.`,
        )
      if (missingDates) warnings.push(`${missingDates} registro(s) sem data válida foram omitidos.`)
      if (results.every((result) => result.status === 'rejected')) throw results[0].reason
      return { items: orderActivities(items), warnings }
    },
    async target(project, record, { signal } = {}) {
      const target = activityTarget(record)
      if (!target) return null
      const path = target.type === 'task' ? 'tasks' : 'files'
      const { data } = await api.get(`/${path}/${encodeURIComponent(target.id)}/`, { signal })
      return targetRoute(record, project, data)
    },
  }
}
