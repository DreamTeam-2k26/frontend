import { reactive } from 'vue'
import { getProject } from '@/api/projects'
import { listAllTasks } from '@/api/tasks'
import { listAllColumns } from '@/api/columns'
import { listMemberships } from '@/api/memberships'
import { apiErrorMessage } from '@/utils/apiErrors'

// Calendário é somente leitura e usa os mesmos serviços paginados do Kanban.
export function useProjectCalendar() {
  const state = reactive({
    project: null,
    tasks: [],
    columns: [],
    members: [],
    status: 'idle',
    error: '',
    errorStatus: null,
  })
  let version = 0
  let controller
  function reset() {
    version++
    controller?.abort()
    Object.assign(state, {
      project: null,
      tasks: [],
      columns: [],
      members: [],
      status: 'idle',
      error: '',
      errorStatus: null,
    })
  }
  async function load(id) {
    reset()
    const current = version
    controller = new AbortController()
    const { signal } = controller
    state.status = 'loading'
    try {
      if (!/^[1-9]\d*$/.test(String(id))) throw { response: { status: 404 } }
      const project = await getProject(id, { signal })
      if (current !== version) return
      const [tasks, columns, members] = await Promise.all([
        listAllTasks(id, { signal }),
        listAllColumns(id, { signal }),
        listMemberships(id, { signal }),
      ])
      if (current !== version) return
      // Falha fechada caso uma resposta da API misture projetos.
      if (
        String(project.id) !== String(id) ||
        [...tasks, ...columns, ...members].some((item) => String(item.project) !== String(id))
      ) {
        throw { response: { status: 404 } }
      }
      Object.assign(state, { project, tasks, columns, members, status: 'ready' })
    } catch (error) {
      if (current !== version || signal.aborted) return
      Object.assign(state, {
        status: 'error',
        errorStatus: error.response?.status ?? null,
        error: apiErrorMessage(error, 'Não foi possível carregar o calendário.'),
      })
    }
  }
  return { state, load, reset }
}
