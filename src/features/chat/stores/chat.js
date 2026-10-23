import { defineStore } from 'pinia'
import { computed, h, reactive, ref } from 'vue'
import { toast } from 'vue3-toastify'
import { refreshAccessToken } from '@/api/session'
import router from '@/router'
import { getAccessToken } from '@/utils/token'
import { clearAttachmentCache } from '../composables/useAttachment'
import * as chatApi from '../services/chatApi'
import {
  applyEvent,
  createState,
  prependHistory,
  pruneTyping,
  setHistory,
  setRooms,
  sortedRooms,
  totalUnread,
  typingUsers,
} from '../lib/chatState'
import { apiErrorMessage } from '../lib/errors'
import { messagePreview } from '../lib/format'
import { ChatSocket, STATUS } from '../lib/socketClient'
import { chatSocketUrl } from '../lib/urls'

const TYPING_SEND_INTERVAL_MS = 2500

export const useChatStore = defineStore('chatStore', () => {
  const state = reactive(createState())
  const me = ref(null)
  const activeRoomId = ref(null)
  const connection = ref(STATUS.IDLE)
  const loadingRooms = ref(false)
  const roomsLoaded = ref(false) // true depois da primeira tentativa de carregar as salas
  const roomsError = ref('')
  const loadingHistory = ref(false)
  const historyError = ref('')
  const details = reactive({}) // id da sala -> RoomDetailSerializer (membros)
  const now = ref(Date.now())

  let socket = null
  let ticker = null
  let hasOpenedBefore = false
  let lastTypingSentAt = 0
  let started = false

  const rooms = computed(() => sortedRooms(state))
  const activeRoom = computed(() => state.rooms[activeRoomId.value] ?? null)
  const activeMessages = computed(() => state.messages[activeRoomId.value] ?? null)
  const unreadTotal = computed(() => totalUnread(state))
  const typingNow = computed(() => typingUsers(state, activeRoomId.value, now.value))
  const isConnected = computed(() => connection.value === STATUS.OPEN)

  // ---- ciclo de vida ----

  /** Liga o chat: carrega o usuário e as salas por REST e abre o WebSocket. */
  async function start() {
    if (started) return

    started = true
    socket = new ChatSocket({
      getToken: getAccessToken,
      refreshToken: refreshAccessToken,
      buildUrl: (token) => chatSocketUrl(token),
      onEvent: handleEvent,
      onStatus: (status) => {
        connection.value = status
      },
      onOpen: handleOpen,
    })
    ticker = setInterval(() => {
      now.value = Date.now()
      pruneTyping(state, now.value)
    }, 1000)
    document.addEventListener('visibilitychange', markActiveRead)

    try {
      me.value = await chatApi.fetchMe()
    } catch (error) {
      roomsError.value = apiErrorMessage(error, 'Não foi possível carregar seu usuário.')
    }

    socket.connect()
    await loadRooms()
  }

  /** Desliga o chat e limpa tudo (nenhum dado de um usuário pode sobrar para o próximo). */
  function stop() {
    started = false
    hasOpenedBefore = false
    socket?.close()
    socket = null
    clearInterval(ticker)
    document.removeEventListener('visibilitychange', markActiveRead)

    Object.assign(state, createState())
    clearAttachmentCache()
    for (const key of Object.keys(details)) delete details[key]

    me.value = null
    activeRoomId.value = null
    connection.value = STATUS.IDLE
    roomsLoaded.value = false
    roomsError.value = ''
    historyError.value = ''
  }

  function retryConnection() {
    socket?.reconnectNow()
  }

  async function handleOpen() {
    const reconnected = hasOpenedBefore

    hasOpenedBefore = true

    // Na primeira conexão start() já carregou tudo (se o REST falhou, tenta de novo agora).
    // Nas seguintes pode ter havido mensagens perdidas enquanto estava offline.
    if (!reconnected && !roomsError.value) return

    await loadRooms()

    if (reconnected && activeRoomId.value && state.rooms[activeRoomId.value]) {
      await loadHistory(activeRoomId.value, { reset: true })
      markActiveRead()
    }
  }

  function handleEvent(event) {
    const effects = applyEvent(state, event, {
      meId: me.value?.id ?? null,
      activeRoomId: activeRoomId.value,
      visible: document.visibilityState === 'visible',
    })

    if (event.type === 'room.updated' && details[event.room]) refreshDetail(event.room)

    for (const effect of effects) {
      if (effect.type === 'read') markActiveRead()
      if (effect.type === 'removed') handleRemoved(effect.room)
      if (effect.type === 'notify') notifyMessage(effect.room, effect.message)
      if (effect.type === 'error') toast.error(effect.detail || 'Ação não permitida.')
    }
  }

  /** Aviso no topo da tela com a prévia da mensagem; clicar leva à sala. */
  function notifyMessage(roomId, message) {
    const roomName = state.rooms[roomId]?.name ?? 'Nova mensagem'
    const author = message.author?.name ?? 'Alguém'

    toast.info(
      () =>
        h('div', { class: 'chat-toast' }, [
          h('strong', `${roomName}`),
          h(
            'div',
            { style: 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap' },
            `${author}: ${messagePreview(message)}`,
          ),
        ]),
      {
        toastId: `chat-message-${message.id}`,
        autoClose: 5000,
        onClick: () => router.push({ name: 'chat', params: { roomId } }),
      },
    )
  }

  function handleRemoved(roomId) {
    delete details[roomId]

    if (activeRoomId.value === roomId) activeRoomId.value = null
  }

  // ---- salas ----

  async function loadRooms() {
    loadingRooms.value = true
    roomsError.value = ''

    try {
      setRooms(state, await chatApi.listRooms())
      markActiveRead()
    } catch (error) {
      roomsError.value = apiErrorMessage(error, 'Não foi possível carregar as salas.')
    } finally {
      loadingRooms.value = false
      roomsLoaded.value = true
    }
  }

  async function openRoom(roomId) {
    activeRoomId.value = roomId

    if (roomId == null) return

    // Membros e presença alimentam os tiques de entrega e o contador de online.
    if (!details[roomId]) loadDetail(roomId)

    if (!state.messages[roomId]?.loaded) await loadHistory(roomId)

    markActiveRead()
  }

  function closeRoom() {
    activeRoomId.value = null
  }

  async function loadHistory(roomId, { reset = false } = {}) {
    loadingHistory.value = true
    historyError.value = ''

    try {
      const page = await chatApi.listMessages(roomId)

      if (reset && state.messages[roomId]) state.messages[roomId].items = []

      setHistory(state, roomId, page)
    } catch (error) {
      if (activeRoomId.value === roomId) {
        historyError.value = apiErrorMessage(error, 'Não foi possível carregar as mensagens.')
      }

      // 404: a sala deixou de existir para este usuário (removido, apagada).
      if (error?.response?.status === 404) handleEvent({ type: 'room.removed', room: roomId })
    } finally {
      loadingHistory.value = false
    }
  }

  async function loadOlder() {
    const roomId = activeRoomId.value
    const entry = state.messages[roomId]

    if (!entry?.hasMore || loadingHistory.value) return false

    loadingHistory.value = true

    try {
      prependHistory(state, roomId, await chatApi.listMessages(roomId, entry.nextBefore))

      return true
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Não foi possível carregar mensagens anteriores.'))

      return false
    } finally {
      loadingHistory.value = false
    }
  }

  async function loadDetail(roomId) {
    try {
      details[roomId] = await chatApi.getRoom(roomId)
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Não foi possível carregar a sala.'))
    }
  }

  async function refreshDetail(roomId) {
    try {
      details[roomId] = await chatApi.getRoom(roomId)
    } catch {
      // A sala pode ter sido removida; o evento room.removed cuida da limpeza.
    }
  }

  function markActiveRead() {
    const roomId = activeRoomId.value

    if (roomId == null || document.visibilityState !== 'visible') return

    const room = state.rooms[roomId]

    if (!room || room.unread === 0) return

    room.unread = 0

    if (!socket?.send({ action: 'read', room: roomId })) {
      chatApi.markRead(roomId).catch(() => {})
    }
  }

  // ---- mensagens ----

  /** Texto: pelo WebSocket quando conectado; senão pelo REST (que também notifica os demais). */
  async function sendText(body, replyTo = null) {
    const roomId = activeRoomId.value
    const text = body.trim()

    if (!roomId || !text) return false

    if (
      socket?.send({
        action: 'send',
        room: roomId,
        body: text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      })
    ) {
      return true
    }

    try {
      const message = await chatApi.sendMessage(roomId, { body: text, replyTo })

      handleEvent({ type: 'message.new', room: roomId, message })

      return true
    } catch (error) {
      toast.error(apiErrorMessage(error))

      return false
    }
  }

  async function sendFile(file, replyTo = null) {
    const roomId = activeRoomId.value

    if (!roomId || !file) return false

    try {
      const message = await chatApi.sendMessage(roomId, { file, replyTo })

      handleEvent({ type: 'message.new', room: roomId, message })

      return true
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Não foi possível enviar o arquivo.'))

      return false
    }
  }

  function editMessage(messageId, body) {
    return requireSocket({ action: 'edit', room: activeRoomId.value, message_id: messageId, body })
  }

  function deleteMessage(messageId) {
    return requireSocket({ action: 'delete', room: activeRoomId.value, message_id: messageId })
  }

  function requireSocket(payload) {
    if (socket?.send(payload)) return true

    toast.error('Sem conexão com as salas. Tente novamente em instantes.')

    return false
  }

  /** Avisa que o usuário está digitando (no máximo uma vez a cada 2,5 s). */
  function notifyTyping() {
    const roomId = activeRoomId.value
    const current = Date.now()

    if (!roomId || current - lastTypingSentAt < TYPING_SEND_INTERVAL_MS) return

    lastTypingSentAt = current
    socket?.send({ action: 'typing', room: roomId })
  }

  // ---- gestão de salas e participantes ----

  async function run(action, fallback) {
    try {
      return await action()
    } catch (error) {
      toast.error(apiErrorMessage(error, fallback))

      return null
    }
  }

  async function createRoom({ name, members, image = null }) {
    return run(async () => {
      const imageKey = image ? await chatApi.uploadImage(image) : null
      const room = await chatApi.createRoom({ name, members, imageKey })

      await loadRooms()

      return room
    }, 'Não foi possível criar a sala.')
  }

  async function updateRoom(roomId, { name, image }) {
    return run(async () => {
      const payload = {}

      if (name !== undefined) payload.name = name
      if (image) payload.image_attachment_key = await chatApi.uploadImage(image)

      details[roomId] = await chatApi.updateRoom(roomId, payload)
      state.rooms[roomId] = {
        ...state.rooms[roomId],
        name: details[roomId].name,
        image: details[roomId].image,
      }

      return details[roomId]
    }, 'Não foi possível atualizar a sala.')
  }

  async function addMembers(roomId, userIds) {
    return run(async () => {
      details[roomId] = await chatApi.addMembers(roomId, userIds)

      return details[roomId]
    }, 'Não foi possível adicionar participantes.')
  }

  async function removeMember(roomId, userId) {
    return run(async () => {
      details[roomId] = await chatApi.removeMember(roomId, userId)

      return details[roomId]
    }, 'Não foi possível remover o participante.')
  }

  async function setAdmin(roomId, userId, isAdmin) {
    return run(async () => {
      details[roomId] = await chatApi.setAdmin(roomId, userId, isAdmin)

      return details[roomId]
    }, 'Não foi possível alterar a permissão.')
  }

  async function leaveRoom(roomId) {
    const result = await run(async () => {
      await chatApi.leaveRoom(roomId)

      return true
    }, 'Não foi possível sair da sala.')

    if (result) handleEvent({ type: 'room.removed', room: roomId })

    return Boolean(result)
  }

  return {
    // estado
    me,
    activeRoomId,
    connection,
    loadingRooms,
    roomsError,
    roomsLoaded,
    loadingHistory,
    historyError,
    details,
    presence: computed(() => state.presence),
    messagesByRoom: computed(() => state.messages),
    // derivados
    rooms,
    activeRoom,
    activeMessages,
    unreadTotal,
    typingNow,
    isConnected,
    // ações
    start,
    stop,
    retryConnection,
    loadRooms,
    openRoom,
    closeRoom,
    loadHistory,
    loadOlder,
    loadDetail,
    sendText,
    sendFile,
    editMessage,
    deleteMessage,
    notifyTyping,
    createRoom,
    updateRoom,
    addMembers,
    removeMember,
    setAdmin,
    leaveRoom,
  }
})
