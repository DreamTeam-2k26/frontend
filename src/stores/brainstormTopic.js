import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'
import { toast } from 'vue3-toastify'
import * as replyApi from '@/api/brainstormReplies'
import * as topicApi from '@/api/brainstormTopics'
import { listMemberships } from '@/api/memberships'
import { getProject } from '@/api/projects'
import { listAllTasks } from '@/api/tasks'
import { apiErrorMessage } from '@/utils/apiErrors'

const AI_MESSAGES = {
  ai_not_configured: 'A IA não está configurada neste servidor. O fórum continua funcionando.',
  ai_unavailable: 'A IA está indisponível ou congestionada agora. Tente novamente em instantes.',
  ai_invalid_response: 'A IA respondeu fora do formato esperado. Tente gerar de novo.',
}

const emptyState = () => ({
  topicId: null,
  projectId: null,
  project: null,
  topic: null,
  replies: [],
  analysis: null,
  analysisStatus: 'idle', // idle | loading | none | running | ready | failed | error
  analysisError: null, // { code, message }
  versions: [],
  tasks: [],
  members: [],
  decisionData: 'idle', // idle | loading | ready | error
  status: 'idle', // idle | loading | ready | missing | error
  error: '',
  errorStatus: null,
  busy: {},
})

// Discussão aberta na tela. Abrir outra (ou outro projeto) descarta respostas da anterior.
export const useBrainstormTopicStore = defineStore('brainstormTopicStore', () => {
  const state = reactive(emptyState())

  let version = 0
  let controller = null

  const project = computed(() => state.project)
  const role = computed(() => state.project?.role ?? null)
  const topic = computed(() => state.topic)
  const replies = computed(() => state.replies)
  const analysis = computed(() => state.analysis)
  const analysisStatus = computed(() => state.analysisStatus)
  const analysisError = computed(() => state.analysisError)
  const versions = computed(() => state.versions)
  const tasks = computed(() => state.tasks)
  const members = computed(() => state.members)
  const decisionData = computed(() => state.decisionData)
  const status = computed(() => state.status)
  const error = computed(() => state.error)
  const errorStatus = computed(() => state.errorStatus)
  const busy = computed(() => state.busy)

  const same = (current) => current === version

  function fail(cause, fallback) {
    toast.error(apiErrorMessage(cause, fallback))
    throw cause
  }

  // Uma ação de cada tipo por vez (evita clique duplo gerar duas requisições).
  async function once(key, action) {
    if (state.busy[key]) return undefined
    state.busy = { ...state.busy, [key]: true }
    const current = version
    try {
      return await action(current)
    } finally {
      if (same(current)) {
        const { [key]: _done, ...rest } = state.busy
        state.busy = rest
      }
    }
  }

  async function open(topicId, projectId) {
    const current = ++version
    controller?.abort()
    controller = new AbortController()
    const { signal } = controller
    Object.assign(state, emptyState(), {
      topicId: Number(topicId),
      projectId: Number(projectId),
      status: 'loading',
      analysisStatus: 'loading',
    })

    try {
      const [{ data }, projectData] = await Promise.all([
        topicApi.getTopic(topicId, { signal }),
        getProject(projectId, { signal }),
      ])
      if (!same(current)) return
      state.project = projectData
      // Link de discussão de outro projeto (que o usuário também acessa) não abre neste projeto.
      if (data.project !== Number(projectId)) {
        Object.assign(state, {
          status: 'missing',
          errorStatus: 404,
          error: 'A discussão não é deste projeto.',
        })
        return
      }
      const replyList = await replyApi.listAllReplies(topicId, { signal })
      if (!same(current)) return
      Object.assign(state, { topic: data, replies: replyList, status: 'ready' })
      loadHistory(current, signal)
    } catch (cause) {
      if (!same(current) || signal.aborted) return
      const httpStatus = cause.response?.status ?? null
      Object.assign(state, {
        status: httpStatus === 404 ? 'missing' : 'error',
        errorStatus: httpStatus,
        error:
          httpStatus === 404
            ? 'A discussão não existe ou não está disponível para sua conta.'
            : apiErrorMessage(cause, 'Não foi possível carregar a discussão.'),
      })
    }
  }

  // Análise e versões carregam (e falham) separadamente: a discussão continua utilizável.
  async function loadHistory(current = version, signal = controller?.signal) {
    state.analysisStatus = 'loading'
    const [analysisResult, versionsResult] = await Promise.allSettled([
      topicApi.getTopicAnalysis(state.topicId, { signal }),
      topicApi.listTopicVersions(state.topicId, { signal }),
    ])
    if (!same(current)) return
    if (analysisResult.status === 'fulfilled') {
      const data = analysisResult.value.data
      state.analysis = data
      state.analysisStatus =
        data.status === 'ready' ? 'ready' : data.status === 'failed' ? 'failed' : 'running'
    } else {
      const notFound = analysisResult.reason?.response?.status === 404
      state.analysis = null
      state.analysisStatus = notFound ? 'none' : 'error'
    }
    if (versionsResult.status === 'fulfilled') state.versions = versionsResult.value.data
  }

  async function refreshTopic(current = version) {
    try {
      const { data } = await topicApi.getTopic(state.topicId)
      if (same(current)) state.topic = data
    } catch {
      // Mantém o que já está na tela; a próxima ação busca de novo.
    }
  }

  async function reloadReplies(current = version) {
    const list = await replyApi.listAllReplies(state.topicId)
    if (same(current)) state.replies = list
  }

  // Respostas

  function addReply({ content, parent = null }) {
    return once(`reply-${parent ?? 'root'}`, async (current) => {
      try {
        await replyApi.createReply({ topic: state.topicId, parent, content })
      } catch (cause) {
        return fail(cause, 'Não foi possível publicar a resposta.')
      }
      // A resposta já existe: se a releitura falhar, ela aparece na próxima abertura.
      await Promise.allSettled([reloadReplies(current), refreshTopic(current)])
      return true
    })
  }

  function editReply(reply, content) {
    return once(`edit-${reply.id}`, async (current) => {
      try {
        const { data } = await replyApi.updateReply(reply.id, { content })
        if (same(current)) {
          state.replies = state.replies.map((other) =>
            other.id === reply.id
              ? { ...other, content: data.content, updated_at: new Date().toISOString() }
              : other,
          )
        }
        toast.success('Resposta editada.')
        return data
      } catch (cause) {
        return fail(cause, 'Não foi possível editar a resposta.')
      }
    })
  }

  function removeReply(reply) {
    return once(`delete-${reply.id}`, async (current) => {
      try {
        await replyApi.deleteReply(reply.id)
      } catch (cause) {
        return fail(cause, 'Não foi possível excluir a resposta.')
      }
      if (same(current)) state.replies = state.replies.filter((other) => other.id !== reply.id)
      toast.success('Resposta excluída.')
      await refreshTopic(current)
    })
  }

  // Votos (value 1, -1 ou 0 para remover)

  function voteTopic(value) {
    return once('vote-topic', async (current) => {
      try {
        const { data } = await topicApi.voteTopic(state.topicId, value)
        if (same(current)) state.topic = { ...state.topic, ...data }
      } catch (cause) {
        return fail(cause, 'Não foi possível registrar o voto.')
      }
    })
  }

  function voteReply(reply, value) {
    return once(`vote-${reply.id}`, async (current) => {
      try {
        const { data } = await replyApi.voteReply(reply.id, value)
        if (same(current)) {
          state.replies = state.replies.map((other) =>
            other.id === reply.id ? { ...other, ...data } : other,
          )
        }
      } catch (cause) {
        return fail(cause, 'Não foi possível registrar o voto.')
      }
    })
  }

  // Tópico

  function updateTopic(fields) {
    return once('update', async (current) => {
      try {
        const { data } = await topicApi.updateTopic(state.topicId, fields)
        if (same(current)) state.topic = { ...state.topic, ...data }
        toast.success('Discussão atualizada.')
        return data
      } catch (cause) {
        return fail(cause, 'Não foi possível salvar a discussão.')
      }
    })
  }

  function deleteTopic() {
    return once('delete', async () => {
      try {
        await topicApi.deleteTopic(state.topicId)
        toast.success('Discussão excluída.')
        return true
      } catch (cause) {
        return fail(cause, 'Não foi possível excluir a discussão.')
      }
    })
  }

  const TRANSITIONS = {
    close: [topicApi.closeTopic, 'Debate encerrado.', 'Não foi possível encerrar a discussão.'],
    reopen: [
      topicApi.reopenTopic,
      'Discussão reaberta: nova versão em revisão.',
      'Não foi possível reabrir.',
    ],
    archive: [
      topicApi.archiveTopic,
      'Discussão arquivada.',
      'Não foi possível arquivar a discussão.',
    ],
  }

  function transition(name) {
    const [call, success, fallback] = TRANSITIONS[name]
    return once(name, async (current) => {
      try {
        const { data } = await call(state.topicId)
        if (!same(current)) return data
        state.topic = data
        toast.success(success)
        loadHistory(current)
        return data
      } catch (cause) {
        if (cause.response?.status === 400) await refreshTopic(current)
        return fail(cause, fallback)
      }
    })
  }

  // Síntese da IA (só com a discussão encerrada; roda na hora no servidor)

  function analyze() {
    return once('analyze', async (current) => {
      state.analysisStatus = 'running'
      state.analysisError = null
      const toastId = toast.loading('Gerando a síntese… isso pode levar até 2 minutos.')
      try {
        const { data } = await topicApi.analyzeTopic(state.topicId)
        if (same(current)) {
          Object.assign(state, { analysis: data, analysisStatus: 'ready' })
          loadHistory(current)
        }
        toast.update(toastId, {
          render: 'Síntese pronta.',
          type: 'success',
          isLoading: false,
          autoClose: 3000,
        })
        return data
      } catch (cause) {
        const code = cause.response?.data?.code
        const message =
          AI_MESSAGES[code] ?? apiErrorMessage(cause, 'Não foi possível gerar a síntese.')
        if (same(current)) {
          state.analysisError = { code: code ?? null, message }
          await loadHistory(current)
          if (state.analysisStatus === 'none' || state.analysisStatus === 'error')
            state.analysisStatus = 'failed'
        }
        toast.update(toastId, { render: message, type: 'error', isLoading: false, autoClose: 5000 })
        throw cause
      }
    })
  }

  // Decisão: tarefas e participantes reais do projeto para vincular/atribuir.
  async function loadDecisionData() {
    if (state.decisionData === 'loading' || state.decisionData === 'ready') return
    const current = version
    state.decisionData = 'loading'
    try {
      const [taskList, memberList] = await Promise.all([
        listAllTasks(state.projectId, { signal: controller?.signal }),
        listMemberships(state.projectId, { signal: controller?.signal }),
      ])
      if (!same(current)) return
      Object.assign(state, { tasks: taskList, members: memberList, decisionData: 'ready' })
    } catch (cause) {
      if (!same(current)) return
      state.decisionData = 'error'
      toast.error(apiErrorMessage(cause, 'Não foi possível carregar as tarefas do projeto.'))
    }
  }

  function approve(body) {
    return once('approve', async (current) => {
      let response
      try {
        response = await topicApi.approveTopic(state.topicId, body)
      } catch (cause) {
        return fail(cause, 'Não foi possível aprovar a decisão.')
      }
      if (response.status === 200)
        toast.info('Esta decisão já estava aprovada: nenhuma tarefa foi duplicada.')
      else toast.success('Decisão aprovada.')
      await Promise.allSettled([refreshTopic(current), loadHistory(current)])
      return response.data
    })
  }

  function reset() {
    version++
    controller?.abort()
    Object.assign(state, emptyState())
  }

  return {
    project,
    role,
    topic,
    replies,
    analysis,
    analysisStatus,
    analysisError,
    versions,
    tasks,
    members,
    decisionData,
    status,
    error,
    errorStatus,
    busy,
    open,
    addReply,
    editReply,
    removeReply,
    voteTopic,
    voteReply,
    updateTopic,
    deleteTopic,
    close: () => transition('close'),
    reopen: () => transition('reopen'),
    archive: () => transition('archive'),
    analyze,
    reloadHistory: () => loadHistory(),
    loadDecisionData,
    approve,
    reset,
  }
})
