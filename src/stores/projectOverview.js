import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'
import { getProjectDashboard, listProjectMembers, listUpcomingTasks } from '@/api/projects'
import { projectError } from '@/components/projects/projectState'
import { mergeUpcoming, toMetrics } from '@/utils/projectDashboard'

const UPCOMING_LIMIT = 3

// Cada seção carrega e falha sozinha: um erro nas entregas não esconde os indicadores.
const loaders = {
  metrics: async (id, signal) => {
    const metrics = toMetrics(await getProjectDashboard(id, { signal }))
    if (!metrics) throw new Error('Resposta inválida dos indicadores.')
    return metrics
  },
  upcoming: async (id, signal) =>
    mergeUpcoming(await listUpcomingTasks(id, { limit: UPCOMING_LIMIT, signal }), UPCOMING_LIMIT),
  members: (id, signal) => listProjectMembers(id, { signal }),
}

const MESSAGES = {
  metrics: 'Não foi possível carregar os indicadores.',
  upcoming: 'Não foi possível carregar as próximas entregas.',
  members: 'Não foi possível carregar os participantes.',
}

const emptySection = () => ({ status: 'idle', data: null, error: '' })

// Visão geral do projeto aberto. Trocar de projeto descarta respostas antigas (versão + abort).
export const useProjectOverviewStore = defineStore('projectOverviewStore', () => {
  const state = reactive({
    projectId: null,
    metrics: emptySection(),
    upcoming: emptySection(),
    members: emptySection(),
  })

  let version = 0
  let controller = null
  // Contador por seção: um "tentar de novo" mais recente vence uma resposta anterior da mesma seção.
  const requests = { metrics: 0, upcoming: 0, members: 0 }

  const metrics = computed(() => state.metrics)
  const upcoming = computed(() => state.upcoming)
  const members = computed(() => state.members)

  async function loadSection(name, current) {
    const request = ++requests[name]
    const section = state[name]
    // Atualizando o mesmo projeto, os números atuais ficam visíveis até chegarem os novos.
    Object.assign(section, { status: section.data ? 'refreshing' : 'loading', error: '' })
    try {
      const data = await loaders[name](state.projectId, controller.signal)
      if (current !== version || request !== requests[name]) return
      Object.assign(section, { status: 'ready', data, error: '' })
    } catch (cause) {
      if (current !== version || request !== requests[name] || controller.signal.aborted) return
      Object.assign(section, {
        status: 'error',
        data: null,
        error: cause.response ? projectError(cause) : MESSAGES[name],
      })
    }
  }

  function loadAll() {
    const current = version
    return Promise.all(Object.keys(loaders).map((name) => loadSection(name, current)))
  }

  function load(projectId) {
    version++
    controller?.abort()
    controller = new AbortController()
    Object.assign(state, {
      projectId: String(projectId),
      metrics: emptySection(),
      upcoming: emptySection(),
      members: emptySection(),
    })
    return loadAll()
  }

  // Volta para a aba ou depois de mudanças em tarefas/membros: recarrega sem limpar a tela.
  function refresh() {
    if (!state.projectId) return Promise.resolve()
    return loadAll()
  }

  function retry(name) {
    if (!state.projectId || !loaders[name]) return Promise.resolve()
    return loadSection(name, version)
  }

  function reset() {
    version++
    controller?.abort()
    Object.assign(state, {
      projectId: null,
      metrics: emptySection(),
      upcoming: emptySection(),
      members: emptySection(),
    })
  }

  return { metrics, upcoming, members, load, refresh, retry, reset }
})
