import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  TYPING_TTL_MS,
  applyEvent,
  createState,
  prependHistory,
  pruneTyping,
  setHistory,
  setRooms,
  sortedRooms,
  totalUnread,
  typingUsers,
  upsertMessage,
} from '../lib/chatState.js'

const msg = (id, extra = {}) => ({
  id,
  room: 1,
  author: { id: 2, name: 'bia' },
  body: `m${id}`,
  read: false,
  ...extra,
})
const room = (id, extra = {}) => ({
  id,
  name: `Sala ${id}`,
  unread: 0,
  last_message_at: null,
  created_at: '2026-01-01T00:00:00Z',
  ...extra,
})

test('upsertMessage mantém ordem por id e não duplica', () => {
  const items = []

  upsertMessage(items, msg(3))
  upsertMessage(items, msg(1))
  upsertMessage(items, msg(2))
  upsertMessage(items, msg(2, { body: 'editada' }))

  assert.deepEqual(
    items.map((m) => m.id),
    [1, 2, 3],
  )
  assert.equal(items[1].body, 'editada')
})

test('setHistory preserva mensagens que chegaram por WS durante o carregamento', () => {
  const state = createState()

  state.messages[1] = { items: [msg(10)], hasMore: false, nextBefore: null, loaded: false }
  setHistory(state, 1, { results: [msg(8), msg(9)], has_more: true, next_before: 8 })

  assert.deepEqual(
    state.messages[1].items.map((m) => m.id),
    [8, 9, 10],
  )
  assert.equal(state.messages[1].hasMore, true)
  assert.equal(state.messages[1].nextBefore, 8)
  assert.equal(state.messages[1].loaded, true)
})

test('prependHistory acrescenta mensagens mais antigas', () => {
  const state = createState()

  setHistory(state, 1, { results: [msg(5), msg(6)], has_more: true, next_before: 5 })
  prependHistory(state, 1, { results: [msg(3), msg(4)], has_more: false, next_before: null })

  assert.deepEqual(
    state.messages[1].items.map((m) => m.id),
    [3, 4, 5, 6],
  )
  assert.equal(state.messages[1].hasMore, false)
})

test('message.new entra no histórico carregado, ignora sala não carregada e pede leitura só da sala aberta', () => {
  const state = createState()

  setHistory(state, 1, { results: [], has_more: false, next_before: null })

  let effects = applyEvent(
    state,
    { type: 'message.new', room: 1, message: msg(1) },
    { meId: 7, activeRoomId: 1 },
  )
  assert.deepEqual(effects, [{ type: 'read', room: 1 }])
  assert.equal(state.messages[1].items.length, 1)

  effects = applyEvent(
    state,
    { type: 'message.new', room: 1, message: msg(2, { author: { id: 7 } }) },
    { meId: 7, activeRoomId: 1 },
  )
  assert.deepEqual(effects, [], 'mensagem própria não pede leitura')

  effects = applyEvent(
    state,
    { type: 'message.new', room: 1, message: msg(3) },
    { meId: 7, activeRoomId: 9 },
  )
  assert.deepEqual(
    effects.map((e) => e.type),
    ['notify'],
    'sala fechada não pede leitura, só avisa',
  )

  applyEvent(state, { type: 'message.new', room: 5, message: msg(1, { room: 5 }) }, { meId: 7 })
  assert.equal(state.messages[5], undefined, 'histórico não carregado é buscado ao abrir a sala')
})

test('message.update substitui a mensagem (edição/exclusão)', () => {
  const state = createState()

  setHistory(state, 1, { results: [msg(1)], has_more: false, next_before: null })
  applyEvent(state, {
    type: 'message.update',
    room: 1,
    message: msg(1, { body: null, is_deleted: true }),
  })

  assert.equal(state.messages[1].items[0].is_deleted, true)
})

test('room.updated atualiza resumo e pede leitura se a sala aberta tem não lidas', () => {
  const state = createState()

  let effects = applyEvent(
    state,
    { type: 'room.updated', room: 1, summary: room(1, { unread: 2 }) },
    { activeRoomId: 1 },
  )
  assert.deepEqual(effects, [{ type: 'read', room: 1 }])
  assert.equal(totalUnread(state), 2)

  effects = applyEvent(
    state,
    { type: 'room.updated', room: 1, summary: room(1, { unread: 0 }) },
    { activeRoomId: 1 },
  )
  assert.deepEqual(effects, [])
  assert.equal(totalUnread(state), 0)
})

test('room.removed apaga sala, histórico e digitação', () => {
  const state = createState()

  setRooms(state, [room(1), room(2)])
  setHistory(state, 1, { results: [msg(1)], has_more: false, next_before: null })

  const effects = applyEvent(state, { type: 'room.removed', room: 1 })

  assert.deepEqual(effects, [{ type: 'removed', room: 1 }])
  assert.deepEqual(Object.keys(state.rooms), ['2'])
  assert.equal(state.messages[1], undefined)
})

test('typing: ignora o próprio usuário, expira e é limpo quando a pessoa envia', () => {
  const state = createState()
  const ana = { id: 1, name: 'ana' }
  const bia = { id: 2, name: 'bia' }

  applyEvent(state, { type: 'typing', room: 1, user: ana }, { meId: 1, now: 1000 })
  assert.deepEqual(typingUsers(state, 1, 1000), [])

  applyEvent(state, { type: 'typing', room: 1, user: bia }, { meId: 1, now: 1000 })
  assert.deepEqual(typingUsers(state, 1, 1000 + TYPING_TTL_MS - 1), [bia])
  assert.deepEqual(typingUsers(state, 1, 1000 + TYPING_TTL_MS), [])

  applyEvent(state, { type: 'typing', room: 1, user: bia }, { meId: 1, now: 2000 })
  applyEvent(state, { type: 'message.new', room: 1, message: msg(1, { author: bia }) }, { meId: 1 })
  assert.deepEqual(typingUsers(state, 1, 2001), [])

  applyEvent(state, { type: 'typing', room: 1, user: bia }, { meId: 1, now: 3000 })
  pruneTyping(state, 3000 + TYPING_TTL_MS)
  assert.deepEqual(state.typing[1], {})
})

test('presence e read.receipt', () => {
  const state = createState()

  applyEvent(state, { type: 'presence', user_id: 2, online: true, last_seen: null })
  assert.deepEqual(state.presence[2], { online: true, last_seen: null })

  setHistory(state, 1, { results: [msg(1), msg(2)], has_more: false, next_before: null })
  applyEvent(state, { type: 'read.receipt', room: 1, message_ids: [2] })
  assert.deepEqual(
    state.messages[1].items.map((m) => m.read),
    [false, true],
  )
})

test('error vira efeito e tipos desconhecidos são ignorados', () => {
  const state = createState()

  assert.deepEqual(applyEvent(state, { type: 'error', detail: 'x' }), [
    { type: 'error', detail: 'x' },
  ])
  assert.deepEqual(applyEvent(state, { type: 'nada' }), [])
  assert.deepEqual(applyEvent(state, null), [])
})

test('sortedRooms ordena por atividade mais recente', () => {
  const state = createState()

  setRooms(state, [
    room(1, { last_message_at: '2026-10-01T10:00:00Z' }),
    room(2, { last_message_at: '2026-10-03T10:00:00Z' }),
    room(3, { last_message_at: null, created_at: '2026-10-02T10:00:00Z' }),
  ])

  assert.deepEqual(
    sortedRooms(state).map((r) => r.id),
    [2, 3, 1],
  )
})

test('message.new de outra pessoa avisa (notify), exceto quando a sala está aberta e visível', () => {
  const state = createState()
  const photo = msg(5, { body: null, file: { name: 'a.png', is_image: true } })

  let effects = applyEvent(
    state,
    { type: 'message.new', room: 1, message: photo },
    { meId: 7, activeRoomId: null },
  )
  assert.deepEqual(effects, [{ type: 'notify', room: 1, message: photo }])

  effects = applyEvent(
    state,
    { type: 'message.new', room: 2, message: msg(6, { room: 2 }) },
    { meId: 7, activeRoomId: 1 },
  )
  assert.equal(effects.filter((e) => e.type === 'notify').length, 1, 'outra sala aberta: avisa')

  effects = applyEvent(
    state,
    { type: 'message.new', room: 1, message: msg(7) },
    { meId: 7, activeRoomId: 1, visible: true },
  )
  assert.deepEqual(effects, [{ type: 'read', room: 1 }], 'vendo a sala: sem aviso')

  effects = applyEvent(
    state,
    { type: 'message.new', room: 1, message: msg(8) },
    { meId: 7, activeRoomId: 1, visible: false },
  )
  assert.deepEqual(
    effects.map((e) => e.type),
    ['read', 'notify'],
    'aba escondida: avisa',
  )

  effects = applyEvent(
    state,
    { type: 'message.new', room: 1, message: msg(9, { author: { id: 7 } }) },
    { meId: 7, activeRoomId: null },
  )
  assert.deepEqual(effects, [], 'mensagem própria nunca avisa')

  effects = applyEvent(state, { type: 'message.update', room: 1, message: msg(5) }, { meId: 7 })
  assert.deepEqual(effects, [], 'edição não avisa')
})
