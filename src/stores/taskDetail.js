import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'
import { toast } from 'vue3-toastify'
import * as checklistApi from '@/api/checklistItems'
import * as commentApi from '@/api/comments'
import * as linkApi from '@/api/supportLinks'
import { getTask } from '@/api/tasks'
import { apiErrorMessage } from '@/utils/apiErrors'
import { sortByPosition } from '@/utils/kanban'
import { useKanbanStore } from './kanban'

// Tarefa aberta no modal. Abrir outra descarta respostas da anterior (checklist/comentários não se misturam).
export const useTaskDetailStore = defineStore('taskDetailStore', () => {
  const state = reactive({
    taskId: null,
    task: null,
    checklist: [],
    comments: [],
    links: [],
    status: 'idle', // idle | loading | ready | missing | error
    error: '',
  })

  let version = 0
  let controller = null

  const task = computed(() => state.task)
  const checklist = computed(() => sortByPosition(state.checklist))
  const comments = computed(() => state.comments)
  const links = computed(() => state.links)
  const status = computed(() => state.status)
  const error = computed(() => state.error)
  const checklistDone = computed(() => state.checklist.filter((item) => item.is_done).length)

  function fail(cause, fallback) {
    toast.error(apiErrorMessage(cause, fallback))
    throw cause
  }

  async function open(taskId) {
    const current = ++version
    controller?.abort()
    controller = new AbortController()
    const { signal } = controller
    Object.assign(state, {
      taskId: Number(taskId),
      task: null,
      checklist: [],
      comments: [],
      links: [],
      status: 'loading',
      error: '',
    })

    try {
      // Tarefa primeiro: id inexistente responde 404 aqui (as listas filtradas dariam 400).
      const { data } = await getTask(taskId, { signal })
      const [checklistItems, commentList, linkList] = await Promise.all([
        checklistApi.listAllChecklistItems(taskId, { signal }),
        commentApi.listAllComments(taskId, { signal }),
        linkApi.listAllSupportLinks(taskId, { signal }),
      ])
      if (current !== version) return
      Object.assign(state, {
        task: data,
        checklist: checklistItems,
        comments: commentList,
        links: linkList,
        status: 'ready',
      })
    } catch (cause) {
      if (current !== version || signal.aborted) return
      const missing = cause.response?.status === 404
      state.status = missing ? 'missing' : 'error'
      state.error = missing
        ? 'A tarefa não existe ou foi excluída.'
        : apiErrorMessage(cause, 'Não foi possível carregar a tarefa.')
    }
  }

  function close() {
    version++
    controller?.abort()
    Object.assign(state, {
      taskId: null,
      task: null,
      checklist: [],
      comments: [],
      links: [],
      status: 'idle',
    })
  }

  // Detalhe atualizado por quem editou a tarefa (store do quadro devolve a versão do servidor).
  function setTask(data) {
    if (data && data.id === state.taskId) state.task = { ...state.task, ...data }
  }

  // Só aplica se a tarefa ainda for a mesma de quando a ação começou.
  const sameTask = (taskId) => taskId === state.taskId

  function syncChecklistCounts() {
    const counts = { checklist_total: state.checklist.length, checklist_done: checklistDone.value }
    if (state.task) state.task = { ...state.task, ...counts }
    useKanbanStore().patchTaskLocal(state.taskId, counts)
  }

  // Card do quadro mostra o número de comentários: acompanha a lista sem precisar de F5.
  function syncCommentCount() {
    const counts = { comments_count: state.comments.length }
    if (state.task) state.task = { ...state.task, ...counts }
    useKanbanStore().patchTaskLocal(state.taskId, counts)
  }

  // Checklist

  async function addItem(text) {
    const taskId = state.taskId
    try {
      const { data } = await checklistApi.createChecklistItem({ task: taskId, text })
      if (!sameTask(taskId)) return data
      state.checklist.push(data)
      syncChecklistCounts()
      return data
    } catch (cause) {
      return fail(cause, 'Não foi possível adicionar o item.')
    }
  }

  async function updateItem(item, fields) {
    const taskId = state.taskId
    try {
      const { data } = await checklistApi.updateChecklistItem(item.id, fields)
      if (!sameTask(taskId)) return data
      state.checklist = state.checklist.map((other) =>
        other.id === item.id ? { ...other, ...data } : other,
      )
      syncChecklistCounts()
      return data
    } catch (cause) {
      return fail(cause, 'Não foi possível atualizar o item.')
    }
  }

  const toggleItem = (item) => updateItem(item, { is_done: !item.is_done })
  const renameItem = (item, text) => updateItem(item, { text })

  async function removeItem(item) {
    const taskId = state.taskId
    try {
      await checklistApi.deleteChecklistItem(item.id)
      if (!sameTask(taskId)) return
      state.checklist = state.checklist.filter((other) => other.id !== item.id)
      syncChecklistCounts()
    } catch (cause) {
      return fail(cause, 'Não foi possível excluir o item.')
    }
  }

  // direction: -1 (subir) ou 1 (descer). O backend exige todos os itens na ordem final.
  async function moveItem(item, direction) {
    const taskId = state.taskId
    const ids = checklist.value.map((other) => other.id)
    const from = ids.indexOf(item.id)
    const to = from + direction
    if (from < 0 || to < 0 || to >= ids.length) return
    ids.splice(to, 0, ids.splice(from, 1)[0])

    const previous = state.checklist
    const byId = new Map(state.checklist.map((other) => [other.id, other]))
    state.checklist = ids.map((id, position) => ({ ...byId.get(id), position }))
    try {
      const { data } = await checklistApi.reorderChecklistItems(taskId, ids)
      if (sameTask(taskId)) state.checklist = data
    } catch (cause) {
      if (sameTask(taskId)) state.checklist = previous
      return fail(cause, 'Não foi possível reordenar o checklist.')
    }
  }

  // Comentários

  async function addComment(body) {
    const taskId = state.taskId
    try {
      await commentApi.createComment({ task: taskId, body })
      // A resposta de criação não traz a foto do autor: recarrega a lista completa.
      const list = await commentApi.listAllComments(taskId)
      if (!sameTask(taskId)) return
      state.comments = list
      syncCommentCount()
    } catch (cause) {
      return fail(cause, 'Não foi possível publicar o comentário.')
    }
  }

  async function editComment(comment, body) {
    const taskId = state.taskId
    try {
      const { data } = await commentApi.updateComment(comment.id, { body })
      if (!sameTask(taskId)) return
      state.comments = state.comments.map((other) =>
        other.id === comment.id
          ? { ...other, body: data.body, updated_at: data.updated_at }
          : other,
      )
    } catch (cause) {
      return fail(cause, 'Não foi possível editar o comentário.')
    }
  }

  async function removeComment(comment) {
    const taskId = state.taskId
    try {
      await commentApi.deleteComment(comment.id)
      if (!sameTask(taskId)) return
      state.comments = state.comments.filter((other) => other.id !== comment.id)
      syncCommentCount()
    } catch (cause) {
      return fail(cause, 'Não foi possível excluir o comentário.')
    }
  }

  // Links de apoio

  async function addLink({ title, url }) {
    const taskId = state.taskId
    try {
      const { data } = await linkApi.createSupportLink({
        project: state.task.project,
        task: taskId,
        title,
        url,
      })
      if (sameTask(taskId)) state.links = [data, ...state.links]
      return data
    } catch (cause) {
      return fail(cause, 'Não foi possível adicionar o link.')
    }
  }

  async function removeLink(link) {
    const taskId = state.taskId
    try {
      await linkApi.deleteSupportLink(link.id)
      if (sameTask(taskId)) state.links = state.links.filter((other) => other.id !== link.id)
    } catch (cause) {
      return fail(cause, 'Não foi possível excluir o link.')
    }
  }

  return {
    task,
    checklist,
    checklistDone,
    comments,
    links,
    status,
    error,
    open,
    close,
    setTask,
    addItem,
    toggleItem,
    renameItem,
    removeItem,
    moveItem,
    addComment,
    editComment,
    removeComment,
    addLink,
    removeLink,
  }
})
