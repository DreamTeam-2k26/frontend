import { computed, h, ref } from 'vue'
import { defineStore } from 'pinia'
import { toast } from 'vue3-toastify'
import { refreshAccessToken } from '@/api/session'
import { getAccessToken } from '@/utils/token'
import { ChatSocket } from '../../chat/lib/socketClient'
import CallToast from '../components/CallToast.vue'
import {
  applyCallChange,
  isDue,
  isLive,
  liveCallOf,
  msUntil,
  nextCallOf,
  upcomingOf,
} from '../lib/callRules'
import { callsSocketUrl } from '../lib/urls'

// O roteador é carregado só ao navegar: importá-lo no topo arrastaria o `window` para quem apenas lê o store.
async function go(location) {
  const { default: router } = await import('@/router')

  return router.push(location)
}

const MAX_TIMER_MS = 2 ** 31 - 1

// Chamadas dos meus projetos (em andamento e agendadas), avisos em tempo real e lembrete na hora marcada.
export const useCallNotifier = defineStore('callNotifier', () => {
  const calls = ref([])
  const loaded = ref(false)
  // Chamada em que estou agora (a tela da chamada informa): não avisa nem mostra o atalho de entrar.
  const activeCallId = ref(null)
  const userId = ref(null)

  let socket = null
  let started = false
  let timers = []

  const liveCalls = computed(() => calls.value.filter(isLive))
  const joinableLive = computed(() =>
    liveCalls.value.filter((call) => call.id !== activeCallId.value),
  )
  const liveFor = (projectId) => liveCallOf(calls.value, projectId)
  const upcomingFor = (projectId) => upcomingOf(calls.value, projectId)
  const nextFor = (projectId) => nextCallOf(calls.value, projectId)

  async function load() {
    try {
      // Carregado só ao usar: a API importa o roteador (e o `window`), que o store não precisa só para ser lido.
      const { listCalls } = await import('../services/callsApi')
      const [live, scheduled] = await Promise.all([
        listCalls({ status: 'live' }),
        listCalls({ status: 'scheduled' }),
      ])

      calls.value = [...live, ...scheduled]
      loaded.value = true
      scheduleReminders()
    } catch {
      // Sem os avisos o resto do site continua funcionando; recarrega ao reconectar.
    }
  }

  function start(currentUserId) {
    userId.value = currentUserId ?? userId.value

    if (started) return

    started = true
    socket = new ChatSocket({
      getToken: getAccessToken,
      refreshToken: refreshAccessToken,
      buildUrl: (token) => callsSocketUrl(token),
      onEvent: handleEvent,
      onOpen: load,
    })
    socket.connect()
  }

  function stop() {
    started = false
    socket?.close()
    socket = null
    clearTimers()
    calls.value = []
    loaded.value = false
    activeCallId.value = null
  }

  function handleEvent(event) {
    if (event.type !== 'call.changed' || !event.call) return

    const previous = calls.value.find((call) => call.id === event.call.id)

    calls.value = applyCallChange(calls.value, event.call, event.removed)
    scheduleReminders()

    const becameLive = isLive(event.call) && !event.removed && !isLive(previous)

    if (becameLive) announceLive(event.call)
  }

  function openProject(call, tab) {
    go({ name: 'project-detail', params: { id: call.project }, query: { aba: tab } })
  }

  function announceLive(call) {
    if (call.id === activeCallId.value || call.created_by?.id === userId.value) return

    toast.info(
      () =>
        h(CallToast, {
          title: 'Chamada em andamento',
          project: call.project_name,
          subtitle: call.title,
        }),
      {
        toastId: `call-live-${call.id}`,
        toastClassName: 'call-toast-card',
        position: 'top-center',
        transition: 'slide',
        icon: false,
        closeButton: false,
        autoClose: 12000,
        onClick: () => go({ name: 'call', params: { id: call.project, callId: call.id } }),
      },
    )
  }

  function announceDue(call) {
    toast.info(
      () =>
        h(CallToast, {
          title: 'Chegou a hora da reunião',
          project: call.project_name,
          subtitle: call.title,
          action: call.can_manage ? 'Iniciar' : 'Ver',
        }),
      {
        toastId: `call-due-${call.id}`,
        toastClassName: 'call-toast-card',
        position: 'top-center',
        transition: 'slide',
        icon: false,
        closeButton: false,
        autoClose: 15000,
        onClick: () => openProject(call, 'reunioes'),
      },
    )
  }

  function clearTimers() {
    timers.forEach(clearTimeout)
    timers = []
  }

  /** Um lembrete na hora marcada de cada reunião agendada que ainda não passou. */
  function scheduleReminders() {
    clearTimers()

    calls.value.forEach((call) => {
      const wait = msUntil(call)

      if (wait === null || !call.scheduled_for || isDue(call) || wait > MAX_TIMER_MS) return

      timers.push(setTimeout(() => announceDue(call), wait))
    })
  }

  return {
    calls,
    loaded,
    activeCallId,
    liveCalls,
    joinableLive,
    liveFor,
    upcomingFor,
    nextFor,
    load,
    start,
    stop,
  }
})
