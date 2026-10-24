import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'
import { toast } from 'vue3-toastify'
import * as checklistApi from '@/api/checklistItems'
import * as commentApi from '@/api/comments'
import * as fileApi from '@/api/files'
import * as linkApi from '@/api/supportLinks'
import { attachTaskFile, detachTaskFile, getTask } from '@/api/tasks'
import { apiErrorMessage } from '@/utils/apiErrors'
import { uploadError } from '@/utils/files'
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
    files: [],
    // Envios em andamento ou que falharam: { key, name, progress, status: 'sending'|'error', error, file }
    uploads: [],
    status: 'idle', // idle | loading | ready | missing | error
    error: '',
  })

  let version = 0
  let controller = null

  const task = computed(() => state.task)
  const checklist = computed(() => sortByPosition(state.checklist))
  const comments = computed(() => state.comments)
  const links = computed(() => state.links)
  const files = computed(() => state.files)
  const uploads = computed(() => state.uploads)
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
      files: [],
      uploads: [],
      status: 'loading',
      error: '',
    })

    try {
      // Tarefa primeiro: id inexistente responde 404 aqui (as listas filtradas dariam 400).
      const { data } = await getTask(taskId, { signal })
      // O backend libera tarefas de qualquer projeto do usuário: um link ?task=id de outro projeto
      // não pode abrir (nem misturar dados) no quadro atual.
      const projectId = useKanbanStore().project?.id
      if (projectId != null && data.project !== projectId) {
        if (current !== version) return
        Object.assign(state, { status: 'missing', error: 'A tarefa não pertence a este projeto.' })
        return
      }
      const [checklistItems, commentList, linkList] = await Promise.all([
        checklistApi.listAllChecklistItems(taskId, { signal }),
        commentApi.listAllComments(taskId, { signal }),
        linkApi.listAllSupportLinks(taskId, { project: data.project, signal }),
      ])
      if (current !== version) return
      Object.assign(state, {
        task: data,
        checklist: checklistItems,
        comments: commentList,
        links: linkList,
        files: data.files ?? [],
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
      files: [],
      uploads: [],
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

  // Publicar e reler falham separadamente: com o POST feito, o comentário já existe (não manter o
  // texto no campo para não publicar de novo).
  async function addComment(body) {
    const taskId = state.taskId
    let created
    try {
      ;({ data: created } = await commentApi.createComment({ task: taskId, body }))
    } catch (cause) {
      return fail(cause, 'Não foi possível publicar o comentário.')
    }
    if (!sameTask(taskId)) return
    state.comments = [...state.comments, { author_profile_picture: null, ...created }]
    syncCommentCount()
    // A resposta de criação não traz a foto do autor: relê a lista; se falhar, fica o que já temos.
    try {
      const list = await commentApi.listAllComments(taskId)
      if (!sameTask(taskId)) return
      state.comments = list
      syncCommentCount()
    } catch {
      // Comentário publicado; a foto aparece na próxima abertura.
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

  // fields: { title?, url?, task? }. Movido para outra tarefa ou desvinculado (task null): sai desta lista.
  async function updateLink(link, fields) {
    const taskId = state.taskId
    try {
      const { data } = await linkApi.updateSupportLink(link.id, fields)
      if (!sameTask(taskId)) return data
      state.links =
        data.task === taskId
          ? state.links.map((other) =>
              other.id === link.id
                ? { ...other, ...data, created_by_name: other.created_by_name }
                : other,
            )
          : state.links.filter((other) => other.id !== link.id)
      return data
    } catch (cause) {
      return fail(cause, 'Não foi possível salvar o link.')
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

  // Arquivos: envia ao projeto e vincula à tarefa. Cada envio mostra progresso e pode falhar sozinho.

  let uploadKey = 0

  async function sendUpload(entry) {
    const taskId = state.taskId
    const project = state.task.project
    Object.assign(entry, { status: 'sending', error: '' })
    try {
      // Upload já feito numa tentativa anterior: repete só o vínculo (não duplica o arquivo).
      if (entry.uploadedId == null) {
        entry.progress = 0
        const { data: uploaded } = await fileApi.uploadFile(
          { project, file: entry.file },
          { onProgress: (value) => (entry.progress = value) },
        )
        entry.uploadedId = uploaded.id
      }
      const { data: attached } = await attachTaskFile(taskId, entry.uploadedId)
      if (!sameTask(taskId)) return
      state.files = [...state.files, attached]
      state.uploads = state.uploads.filter((item) => item.key !== entry.key)
    } catch (cause) {
      if (!sameTask(taskId)) return
      entry.status = 'error'
      entry.error = apiErrorMessage(cause, 'Não foi possível enviar o arquivo.')
    }
  }

  function uploadFiles(fileList) {
    const rejected = []
    for (const file of fileList) {
      const problem = uploadError(file)
      if (problem) {
        rejected.push(problem)
        continue
      }
      const entry = reactive({
        uploadedId: null,
        key: ++uploadKey,
        name: file.name,
        file,
        progress: 0,
        status: 'sending',
        error: '',
      })
      state.uploads = [...state.uploads, entry]
      sendUpload(entry)
    }
    if (rejected.length) toast.error(rejected.join(' '))
  }

  function retryUpload(key) {
    const entry = state.uploads.find((item) => item.key === key)
    if (entry) sendUpload(entry)
  }

  function dismissUpload(key) {
    state.uploads = state.uploads.filter((item) => item.key !== key)
  }

  // Desvincula da tarefa; o arquivo continua na área de arquivos do projeto.
  async function removeFile(file) {
    const taskId = state.taskId
    try {
      await detachTaskFile(taskId, file.id)
      if (sameTask(taskId)) state.files = state.files.filter((other) => other.id !== file.id)
      toast.success('Arquivo removido da tarefa.')
    } catch (cause) {
      return fail(cause, 'Não foi possível remover o arquivo da tarefa.')
    }
  }

  // Download autenticado (blob) salvo com o nome original.
  async function downloadFile(file) {
    try {
      const { data } = await fileApi.downloadFile(file.id)
      const url = URL.createObjectURL(data)
      const link = Object.assign(document.createElement('a'), { href: url, download: file.name })
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (cause) {
      return fail(cause, 'Não foi possível baixar o arquivo.')
    }
  }

  return {
    task,
    files,
    uploads,
    uploadFiles,
    retryUpload,
    dismissUpload,
    removeFile,
    downloadFile,
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
    updateLink,
    removeLink,
  }
})
