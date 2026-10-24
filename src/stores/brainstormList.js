import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'
import { toast } from 'vue3-toastify'
import * as topicApi from '@/api/brainstormTopics'
import { apiErrorMessage } from '@/utils/apiErrors'

const PAGE_SIZE = 20

// Lista de discussões do projeto aberto. Trocar de projeto/filtro descarta respostas antigas.
export const useBrainstormListStore = defineStore('brainstormListStore', () => {
  const state = reactive({
    projectId: null,
    query: null,
    topics: [],
    page: 0,
    totalPages: 0,
    count: 0,
    status: 'idle', // idle | loading | ready | error
    loadingMore: false,
    error: '',
  })

  let version = 0
  let controller = null

  const topics = computed(() => state.topics)
  const status = computed(() => state.status)
  const error = computed(() => state.error)
  const count = computed(() => state.count)
  const loadingMore = computed(() => state.loadingMore)
  const hasMore = computed(() => state.page < state.totalPages)

  function request(page, signal) {
    return topicApi.listTopics(
      { project: state.projectId, ...state.query, page, pageSize: PAGE_SIZE },
      { signal },
    )
  }

  async function load(projectId, query) {
    const current = ++version
    controller?.abort()
    controller = new AbortController()
    const { signal } = controller
    Object.assign(state, {
      projectId: String(projectId),
      query: { ...query },
      topics: [],
      page: 0,
      totalPages: 0,
      count: 0,
      status: 'loading',
      loadingMore: false,
      error: '',
    })
    try {
      const { data } = await request(1, signal)
      if (current !== version) return
      Object.assign(state, {
        topics: data.results,
        page: 1,
        totalPages: data.total_pages,
        count: data.count,
        status: 'ready',
      })
    } catch (cause) {
      if (current !== version || signal.aborted) return
      state.status = 'error'
      state.error = apiErrorMessage(cause, 'Não foi possível carregar as discussões.')
    }
  }

  async function loadMore() {
    if (state.loadingMore || !hasMore.value) return
    const current = version
    state.loadingMore = true
    try {
      const { data } = await request(state.page + 1, controller?.signal)
      if (current !== version) return
      const known = new Set(state.topics.map((topic) => topic.id))
      state.topics = [...state.topics, ...data.results.filter((topic) => !known.has(topic.id))]
      Object.assign(state, {
        page: state.page + 1,
        totalPages: data.total_pages,
        count: data.count,
      })
    } catch (cause) {
      if (current !== version) return
      toast.error(apiErrorMessage(cause, 'Não foi possível carregar mais discussões.'))
      throw cause
    } finally {
      if (current === version) state.loadingMore = false
    }
  }

  async function createTopic(payload) {
    try {
      const { data } = await topicApi.createTopic({ project: state.projectId, ...payload })
      toast.success('Discussão criada.')
      return data
    } catch (cause) {
      toast.error(apiErrorMessage(cause, 'Não foi possível criar a discussão.'))
      throw cause
    }
  }

  // Contagem real para o atalho da Visão geral (sem guardar a lista).
  async function countOpen(projectId, { signal } = {}) {
    const { data } = await topicApi.listTopics(
      { project: projectId, status: 'open', page: 1, pageSize: 1 },
      { signal },
    )
    return data.count
  }

  function reset() {
    version++
    controller?.abort()
    Object.assign(state, {
      projectId: null,
      query: null,
      topics: [],
      page: 0,
      totalPages: 0,
      count: 0,
      status: 'idle',
      loadingMore: false,
      error: '',
    })
  }

  return {
    topics,
    status,
    error,
    count,
    hasMore,
    loadingMore,
    load,
    loadMore,
    createTopic,
    countOpen,
    reset,
  }
})
