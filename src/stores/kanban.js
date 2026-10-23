import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'
import { toast } from 'vue3-toastify'
import * as columnApi from '@/api/columns'
import { listAllMembers } from '@/api/memberships'
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
        listAllMembers(projectId, { signal }),
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
  // busca a tarefa completa para o card ficar igual ao do servidor.
  async function syncTask(id) {
    const { data } = await taskApi.getTask(id)
    const exists = state.tasks.some((task) => task.id === id)
    state.tasks = exists
      ? state.tasks.map((task) => (task.id === id ? { ...task, ...data } : task))
      : [...state.tasks, data]
    return data
  }

  async function createTask(payload) {
    try {
      const { data } = await taskApi.createTask({ ...payload, project: state.project.id })
      const task = await syncTask(data.id)
      toast.success('Tarefa criada.')
      return task
    } catch (cause) {
      return fail(cause, 'Não foi possível criar a tarefa.')
    }
  }

  async function updateTaskFields(id, fields) {
    try {
      await taskApi.updateTask(id, fields)
      return await syncTask(id)
    } catch (cause) {
      if (cause.response?.status === 404) await refreshTasks()
      return fail(cause, 'Não foi possível salvar a tarefa.')
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
