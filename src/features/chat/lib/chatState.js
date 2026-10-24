// Estado do chat e aplicação dos eventos do servidor. Tudo aqui é JS puro (sem Vue/Pinia):
// a store só envolve este estado em `reactive` e repassa os eventos do WebSocket.

export const TYPING_TTL_MS = 4000

export function createState() {
  return {
    rooms: {}, // id -> resumo da sala (RoomSerializer)
    messages: {}, // id da sala -> { items, hasMore, nextBefore, loaded }
    typing: {}, // id da sala -> { id do usuário -> { user, until } }
    presence: {}, // id do usuário -> { online, last_seen }
  }
}

function bucket(state, roomId) {
  if (!state.messages[roomId]) {
    state.messages[roomId] = { items: [], hasMore: false, nextBefore: null, loaded: false }
  }

  return state.messages[roomId]
}

/** Insere ou substitui uma mensagem mantendo a lista ordenada por id e sem duplicatas. */
export function upsertMessage(items, message) {
  const index = items.findIndex((item) => item.id === message.id)

  if (index >= 0) {
    // _key identifica o elemento na tela; mantê-lo evita recriar o balão quando a mensagem é atualizada.
    const key = items[index]._key

    items[index] = key && !message._key ? { ...message, _key: key } : message

    return items
  }

  let position = items.length

  while (position > 0 && items[position - 1].id > message.id) position -= 1
  items.splice(position, 0, message)

  return items
}

/** Substitui a lista de salas (ex.: após reconectar). */
export function setRooms(state, rooms) {
  const next = {}

  for (const room of rooms) next[room.id] = room

  state.rooms = next

  for (const id of Object.keys(state.messages)) {
    if (!next[id]) delete state.messages[id]
  }
}

/** Define a primeira página do histórico de uma sala (já em ordem cronológica). */
export function setHistory(state, roomId, page) {
  const entry = bucket(state, roomId)

  // Preserva mensagens que chegaram por WebSocket enquanto a página carregava.
  const merged = [...page.results]

  for (const message of entry.items) upsertMessage(merged, message)

  entry.items = merged
  entry.hasMore = page.has_more
  entry.nextBefore = page.next_before
  entry.loaded = true
}

/** Acrescenta uma página mais antiga ao início. */
export function prependHistory(state, roomId, page) {
  const entry = bucket(state, roomId)

  for (const message of page.results) upsertMessage(entry.items, message)

  entry.hasMore = page.has_more
  entry.nextBefore = page.next_before
}

/** Salas ordenadas pela atividade mais recente. */
export function sortedRooms(state) {
  return Object.values(state.rooms).sort((a, b) => {
    const left = a.last_message_at ?? a.created_at ?? ''
    const right = b.last_message_at ?? b.created_at ?? ''

    if (left === right) return b.id - a.id

    return left < right ? 1 : -1
  })
}

/** Quem está digitando na sala agora (descarta entradas vencidas). */
export function typingUsers(state, roomId, now = Date.now()) {
  const entries = state.typing[roomId]

  if (!entries) return []

  return Object.values(entries)
    .filter((entry) => entry.until > now)
    .map((entry) => entry.user)
}

/**
 * Aplica um evento do servidor. Devolve a lista de efeitos que o chamador deve executar:
 *  - { type: 'read', room }       marcar a sala aberta como lida
 *  - { type: 'notify', room, message }  mensagem nova de outra pessoa que o usuário ainda não está vendo
 *  - { type: 'removed', room }    a sala saiu da lista (o chamador fecha a conversa se estava aberta)
 *  - { type: 'error', detail }    erro do servidor para mostrar ao usuário
 */
export function applyEvent(
  state,
  event,
  { meId = null, activeRoomId = null, now = Date.now(), visible = true } = {},
) {
  const effects = []

  switch (event?.type) {
    case 'message.new':
    case 'message.update': {
      const { room, message } = event
      const entry = state.messages[room]

      if (entry?.loaded) upsertMessage(entry.items, message)

      if (event.type === 'message.new') {
        if (message.author) clearTyping(state, room, message.author.id)

        const fromOther = message.author?.id !== meId
        const watching = room === activeRoomId && visible

        if (fromOther && room === activeRoomId) effects.push({ type: 'read', room })

        // Avisa de mensagem nova de outra pessoa, exceto se ela já está vendo essa sala.
        if (fromOther && !watching) effects.push({ type: 'notify', room, message })
      }

      break
    }

    case 'room.updated': {
      state.rooms[event.room] = event.summary

      if (event.room === activeRoomId && event.summary.unread > 0) {
        effects.push({ type: 'read', room: event.room })
      }

      break
    }

    case 'room.removed': {
      delete state.rooms[event.room]
      delete state.messages[event.room]
      delete state.typing[event.room]
      effects.push({ type: 'removed', room: event.room })

      break
    }

    case 'typing': {
      if (event.user?.id === meId) break

      state.typing[event.room] ??= {}
      state.typing[event.room][event.user.id] = { user: event.user, until: now + TYPING_TTL_MS }

      break
    }

    case 'presence': {
      state.presence[event.user_id] = { online: event.online, last_seen: event.last_seen }

      break
    }

    case 'read.receipt': {
      const entry = state.messages[event.room]

      if (entry) {
        const ids = new Set(event.message_ids)

        for (const message of entry.items) {
          if (ids.has(message.id)) message.read = true
        }
      }

      break
    }

    case 'error': {
      effects.push({ type: 'error', detail: event.detail })

      break
    }

    default:
      break
  }

  return effects
}

function clearTyping(state, roomId, userId) {
  if (state.typing[roomId]) delete state.typing[roomId][userId]
}

/** Remove indicadores de "digitando" vencidos. */
export function pruneTyping(state, now = Date.now()) {
  for (const roomId of Object.keys(state.typing)) {
    for (const [userId, entry] of Object.entries(state.typing[roomId])) {
      if (entry.until <= now) delete state.typing[roomId][userId]
    }
  }
}

/** Total de mensagens não lidas em todas as salas. */
export function totalUnread(state) {
  return Object.values(state.rooms).reduce((sum, room) => sum + (room.unread ?? 0), 0)
}
