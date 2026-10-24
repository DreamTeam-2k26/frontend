import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'
import { toast } from 'vue3-toastify'
import * as columnApi from '@/api/columns'
import { listMemberships } from '@/api/memberships'
import { getProject } from '@/api/projects'
import * as taskApi from '@/api/tasks'
import { apiErrorMessage } from '@/utils/apiErrors'
import {
  applyMoveResult,
  canManageColumns,
  groupTasks,
  moveLocally,
  sortByPosition,
} from '@/utils/kanban'

// Quadro do projeto aberto. Troca de projeto descarta respostas antigas (versão + AbortController).
export const useKanbanStore = defineStore('kanbanStore', () => {
  const state = reactive({
    projectId: null,
    project: null,
    columns: [],
    tasks: [],
    members: [],
    status: 'idle', // idle | loading | ready | error
    error: '',
    errorStatus: null,
  })

  let version = 0
  let controller = null
  let moveQueue = Promise.resolve()

  const project = computed(() => state.project)
  const status = computed(() => state.status)
  const error = computed(() => state.error)
  const errorStatus = computed(() => state.errorStatus)
  const columns = computed(() => sortByPosition(state.columns))
  const tasks = computed(() => state.tasks)
  const members = computed(() => state.members)
  const columnsById = computed(() => new Map(state.columns.map((column) => [column.id, column])))
  const tasksByColumn = computed(() => groupTasks(columns.value, state.tasks))
  const role = computed(() => state.project?.role ?? null)
  const canManage = computed(() => canManageColumns(role.value))

  function fail(cause, fallback) {
    toast.error(apiErrorMessage(cause, fallback))
    throw cause
  }

  async function load(projectId) {
    const current = ++version
    controller?.abort()
    controller = new AbortController()
    const { signal } = controller

    Object.assign(state, {
      projectId: String(projectId),
      project: null,
      columns: [],
      tasks: [],
      members: [],
      status: 'loading',
      error: '',
      errorStatus: null,
    })

    if (!/^\d+$/.test(String(projectId))) {
      Object.assign(state, {
        status: 'error',
        errorStatus: 404,
        error: 'Confira o endereço ou volte para Meus Projetos.',
      })
      return
    }

    try {
      const projectData = await getProject(projectId, { signal })
      const [columnList, taskList, memberList] = await Promise.all([
        columnApi.listAllColumns(projectId, { signal }),
        taskApi.listAllTasks(projectId, { signal }),
        listMemberships(projectId, { signal }),
      ])
      if (current !== version) return
      Object.assign(state, {
        project: projectData,
        columns: columnList,
        tasks: taskList,
        members: memberList,
        status: 'ready',
      })
    } catch (cause) {
      if (current !== version || signal.aborted) return
      const httpStatus = cause.response?.status ?? null
      Object.assign(state, {
        status: 'error',
        errorStatus: httpStatus,
        error:
          httpStatus === 404
            ? 'O projeto não existe ou não está disponível para sua conta.'
            : apiErrorMessage(cause, 'Não foi possível carregar o quadro.'),
      })
    }
  }

  function reset() {
    version++
    controller?.abort()
    Object.assign(state, { projectId: null, project: null, columns: [], tasks: [], members: [] })
    state.status = 'idle'
  }

  // Recarrega a partir do servidor depois de uma rejeição, para não mostrar estado inventado.
  async function refreshTasks() {
    const current = version
    try {
      const list = await taskApi.listAllTasks(state.projectId)
      if (current === version) state.tasks = list
    } catch (cause) {
      toast.error(apiErrorMessage(cause, 'Não foi possível atualizar as tarefas.'))
    }
  }

  async function refreshColumns() {
    const current = version
    try {
      const list = await columnApi.listAllColumns(state.projectId)
      if (current === version) state.columns = list
    } catch (cause) {
      toast.error(apiErrorMessage(cause, 'Não foi possível atualizar as colunas.'))
    }
  }

  // Colunas (dono/administrador; o servidor valida de novo)

  async function createColumn({ name, category }) {
    try {
      const { data } = await columnApi.createColumn({ project: state.project.id, name, category })
      state.columns.push(data)
      toast.success('Coluna criada.')
      return data
    } catch (cause) {
      return fail(cause, 'Não foi possível criar a coluna.')
    }
  }

  async function renameColumn(id, name) {
    try {
      const { data } = await columnApi.updateColumn(id, { name })
      state.columns = state.columns.map((column) =>
        column.id === id ? { ...column, ...data } : column,
      )
      return data
    } catch (cause) {
      return fail(cause, 'Não foi possível renomear a coluna.')
    }
  }

  async function deleteColumn(id) {
    try {
      await columnApi.deleteColumn(id)
      state.columns = state.columns.filter((column) => column.id !== id)
      toast.success('Coluna excluída.')
    } catch (cause) {
      return fail(cause, 'Não foi possível excluir a coluna.')
    }
  }

  // direction: -1 (esquerda) ou 1 (direita). Envia a ordem completa, como o backend exige.
  async function moveColumn(id, direction) {
    const ids = columns.value.map((column) => column.id)
    const from = ids.indexOf(id)
    const to = from + direction
    if (from < 0 || to < 0 || to >= ids.length) return
    ids.splice(to, 0, ids.splice(from, 1)[0])

    const previous = state.columns
    state.columns = ids.map((columnId, position) => ({
      ...columnsById.value.get(columnId),
      position,
    }))
    try {
      const { data } = await columnApi.reorderColumns(state.project.id, ids)
      state.columns = data
    } catch (cause) {
      state.columns = previous
      await refreshColumns()
      return fail(cause, 'Não foi possível reordenar as colunas.')
    }
  }

  // Tarefas (qualquer participante)

  // As respostas de POST/PATCH não trazem os campos calculados (responsável, atraso, checklist):
  // busca a tarefa completa para o card ficar igual ao do servidor. Só aplica se o quadro ainda é o
  // mesmo da operação (current) e se a tarefa é deste projeto.
  async function syncTask(id, current = version) {
    const { data } = await taskApi.getTask(id)
    if (current === version && data.project === state.project?.id) upsertTask(data)
    return data
  }

  function upsertTask(data) {
    const exists = state.tasks.some((task) => task.id === data.id)
    state.tasks = exists
      ? state.tasks.map((task) => (task.id === data.id ? { ...task, ...data } : task))
      : [...state.tasks, data]
  }

  // Card provisório com o que o POST/PATCH devolveu, quando a leitura completa falha.
  function provisional(data) {
    const member = state.members.find((item) => item.user === data.assignee)
    return {
      is_overdue: false,
      checklist_total: 0,
      checklist_done: 0,
      comments_count: 0,
      ...data,
      assignee_name: member?.user_name ?? null,
    }
  }

  // A escrita e a leitura seguinte falham separadamente: se o POST deu certo, a tarefa está criada
  // (não deixar o formulário aberto para criar outra igual).
  async function createTask(payload) {
    const current = version
    let created
    try {
      ;({ data: created } = await taskApi.createTask({ ...payload, project: state.project.id }))
    } catch (cause) {
      return fail(cause, 'Não foi possível criar a tarefa.')
    }
    toast.success('Tarefa criada.')
    try {
      return await syncTask(created.id, current)
    } catch {
      if (current === version) upsertTask(provisional(created))
      return created
    }
  }

  async function updateTaskFields(id, fields) {
    const current = version
    let saved
    try {
      ;({ data: saved } = await taskApi.updateTask(id, fields))
    } catch (cause) {
      if (cause.response?.status === 404) await refreshTasks()
      return fail(cause, 'Não foi possível salvar a tarefa.')
    }
    try {
      return await syncTask(id, current)
    } catch {
      // Salvo no servidor; sem a leitura completa, aplica só os campos devolvidos pelo PATCH.
      const known = state.tasks.find((task) => task.id === id)
      const merged = provisional({ ...known, ...saved })
      if (current === version && known) upsertTask(merged)
      return merged
    }
  }

  function patchTaskLocal(id, fields) {
    state.tasks = state.tasks.map((task) => (task.id === id ? { ...task, ...fields } : task))
  }

  async function deleteTask(id) {
    try {
      await taskApi.deleteTask(id)
      state.tasks = state.tasks.filter((task) => task.id !== id)
      toast.success('Tarefa excluída.')
    } catch (cause) {
      if (cause.response?.status === 404) await refreshTasks()
      return fail(cause, 'Não foi possível excluir a tarefa.')
    }
  }

  // Arrasto e "Mover para": otimista, um movimento por vez, ordem final vinda do servidor.
  function moveTask(id, columnId, position) {
    const run = async () => {
      if (!state.tasks.some((task) => task.id === id)) return null
      state.tasks = moveLocally(state.tasks, id, columnId, position)
      const current = version
      try {
        const { data } = await taskApi.moveTask(id, { columnId, position })
        if (current === version) state.tasks = applyMoveResult(state.tasks, data)
        return data
      } catch (cause) {
        await refreshTasks()
        return fail(cause, 'Não foi possível mover a tarefa.')
      }
    }
    const result = moveQueue.then(run, run)
    moveQueue = result.catch(() => {})
    return result
  }

  return {
    project,
    status,
    error,
    errorStatus,
    columns,
    tasks,
    members,
    columnsById,
    tasksByColumn,
    role,
    canManage,
    load,
    reset,
    refreshTasks,
    createColumn,
    renameColumn,
    deleteColumn,
    moveColumn,
    createTask,
    updateTaskFields,
    patchTaskLocal,
    deleteTask,
    moveTask,
  }
})
