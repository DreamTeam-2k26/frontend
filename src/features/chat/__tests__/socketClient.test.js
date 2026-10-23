import assert from 'node:assert/strict'
import { test } from 'node:test'

import { CLOSE_UNAUTHORIZED, ChatSocket, STATUS, backoffDelay } from '../lib/socketClient.js'

class FakeWebSocket {
  static instances = []

  constructor(url) {
    this.url = url
    this.sent = []
    FakeWebSocket.instances.push(this)
  }

  send(data) {
    this.sent.push(data)
  }

  close(code = 1000) {
    this.closedWith = code
  }

  // helpers de teste
  open() {
    this.onopen?.()
  }

  receive(data) {
    this.onmessage?.({ data: typeof data === 'string' ? data : JSON.stringify(data) })
  }

  drop(code = 1006) {
    this.onclose?.({ code })
  }

  // Falha de conexão como no Node: só `error`, com o socket preso em CONNECTING (0), sem `close`.
  failWithoutClose() {
    this.readyState = 0
    this.onerror?.({})
  }
}

function fakeTimers() {
  const timers = []

  return {
    timers,
    setTimeoutImpl: (fn, ms) => {
      const timer = { fn, ms, cleared: false }

      timers.push(timer)

      return timer
    },
    clearTimeoutImpl: (timer) => {
      if (timer) timer.cleared = true
    },
    fire: () => {
      const pending = timers.filter((t) => !t.cleared)
      const next = pending[pending.length - 1]

      next.cleared = true
      next.fn()
    },
  }
}

function setup(overrides = {}) {
  FakeWebSocket.instances = []

  const timers = fakeTimers()
  const events = []
  const statuses = []
  const state = { token: 'tok1', opens: 0 }
  const client = new ChatSocket({
    getToken: () => state.token,
    buildUrl: (token) => `ws://srv/ws/chat/?token=${token}`,
    onEvent: (e) => events.push(e),
    onStatus: (s) => statuses.push(s),
    onOpen: () => (state.opens += 1),
    WebSocketImpl: FakeWebSocket,
    setTimeoutImpl: timers.setTimeoutImpl,
    clearTimeoutImpl: timers.clearTimeoutImpl,
    backoff: { random: () => 0 },
    ...overrides,
  })
  const last = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1]

  return { client, timers, events, statuses, state, last }
}

test('backoffDelay cresce exponencialmente, respeita o teto e tem jitter', () => {
  assert.equal(backoffDelay(0, { random: () => 0 }), 500)
  assert.equal(backoffDelay(0, { random: () => 1 }), 1000)
  assert.equal(backoffDelay(3, { random: () => 1 }), 8000)
  assert.equal(backoffDelay(20, { random: () => 1 }), 30_000)
})

test('conecta com o token, entrega eventos JSON e ignora lixo', () => {
  const { client, events, statuses, last, state } = setup()

  client.connect()
  assert.equal(last().url, 'ws://srv/ws/chat/?token=tok1')
  last().open()
  last().receive({ type: 'presence', user_id: 1 })
  last().receive('não é json')
  last().receive('[1,2]')

  assert.deepEqual(events, [{ type: 'presence', user_id: 1 }])
  assert.deepEqual(statuses, [STATUS.CONNECTING, STATUS.OPEN])
  assert.equal(state.opens, 1)
  assert.equal(client.isOpen, true)
})

test('send só funciona com a conexão aberta', () => {
  const { client, last } = setup()

  assert.equal(client.send({ a: 1 }), false)
  client.connect()
  assert.equal(client.send({ a: 1 }), false, 'ainda conectando')
  last().open()
  assert.equal(client.send({ action: 'typing', room: 1 }), true)
  assert.deepEqual(last().sent, ['{"action":"typing","room":1}'])
})

test('sem token não abre socket e fica não autorizado', () => {
  const { client, state, statuses } = setup()

  state.token = null
  client.connect()

  assert.equal(FakeWebSocket.instances.length, 0)
  assert.equal(client.status, STATUS.UNAUTHORIZED)
  assert.deepEqual(statuses, [STATUS.UNAUTHORIZED])
})

test('queda de rede reconecta com backoff e volta a OPEN', () => {
  const { client, timers, last, statuses } = setup()

  client.connect()
  last().open()
  last().drop(1006)

  assert.equal(client.status, STATUS.RECONNECTING)
  assert.equal(timers.timers.filter((t) => !t.cleared && t.ms === 500).length, 1)

  timers.fire() // dispara a reconexão
  assert.equal(FakeWebSocket.instances.length, 2)
  last().open()

  assert.equal(client.status, STATUS.OPEN)
  assert.deepEqual(statuses, [STATUS.CONNECTING, STATUS.OPEN, STATUS.RECONNECTING, STATUS.OPEN])
})

test('o backoff só zera depois que a conexão se mantém estável', () => {
  const { client, timers, last } = setup()

  client.connect()
  last().open()
  last().drop(1006) // queda rápida: sem zerar
  timers.fire()
  last().open()
  last().drop(1006)

  assert.equal(client.attempt, 2)

  timers.fire()
  last().open()
  // dispara o timer de estabilidade (o último timer pendente)
  timers.fire()
  assert.equal(client.attempt, 0)
})

test('4401 renova o token uma vez e reconecta com o token novo', async () => {
  let refreshed = 0
  const { client, state, last } = setup({
    refreshToken: async () => {
      refreshed += 1
      state.token = 'tok2'

      return 'tok2'
    },
  })

  client.connect()
  last().open()
  last().drop(CLOSE_UNAUTHORIZED)
  await new Promise((resolve) => setTimeout(resolve, 0))

  assert.equal(refreshed, 1)
  assert.equal(FakeWebSocket.instances.length, 2)
  assert.equal(last().url, 'ws://srv/ws/chat/?token=tok2')
})

test('4401 repetido (servidor recusa o token novo) não entra em loop', async () => {
  let refreshed = 0
  const { client, statuses, last } = setup({
    refreshToken: async () => {
      refreshed += 1

      return 'tok2'
    },
  })

  client.connect()
  last().open()
  last().drop(CLOSE_UNAUTHORIZED)
  await new Promise((resolve) => setTimeout(resolve, 0))
  last().open()
  last().drop(CLOSE_UNAUTHORIZED)
  await new Promise((resolve) => setTimeout(resolve, 0))

  assert.equal(refreshed, 1)
  assert.equal(FakeWebSocket.instances.length, 2)
  assert.equal(client.status, STATUS.UNAUTHORIZED)
  assert.equal(statuses[statuses.length - 1], STATUS.UNAUTHORIZED)
})

test('4401 sem renovação possível: não reconecta', async () => {
  const { client, last } = setup({ refreshToken: async () => null })

  client.connect()
  last().open()
  last().drop(CLOSE_UNAUTHORIZED)
  await new Promise((resolve) => setTimeout(resolve, 0))

  assert.equal(FakeWebSocket.instances.length, 1)
  assert.equal(client.status, STATUS.UNAUTHORIZED)
})

test('close() é definitivo: cancela reconexão e ignora eventos tardios', () => {
  const { client, timers, last, events } = setup()

  client.connect()
  const first = last()

  first.open()
  first.drop(1006)
  client.close()

  assert.equal(
    timers.timers.every((t) => t.cleared),
    true,
  )
  assert.equal(client.status, STATUS.CLOSED)

  first.receive({ type: 'presence' })
  assert.deepEqual(events, [])
  assert.equal(FakeWebSocket.instances.length, 1)
})

test('close() com socket aberto fecha com 1000 e não agenda reconexão', () => {
  const { client, last } = setup()

  client.connect()
  const socket = last()

  socket.open()
  client.close()

  assert.equal(socket.closedWith, 1000)
  assert.equal(client.status, STATUS.CLOSED)
})

test('reconnectNow descarta o socket antigo e abre outro imediatamente', () => {
  const { client, last } = setup()

  client.connect()
  const first = last()

  first.open()
  client.reconnectNow()

  assert.equal(FakeWebSocket.instances.length, 2)
  assert.equal(first.closedWith, 1000)
  first.drop(1006) // evento tardio do socket antigo não afeta o novo
  assert.equal(client.socket, last())
})

test('connect() repetido não abre uma segunda conexão', () => {
  const { client } = setup()

  client.connect()
  client.connect()

  assert.equal(FakeWebSocket.instances.length, 1)
})

test('falha de conexão que só dispara "error" (como no Node) também reconecta', () => {
  const { client, timers, last, statuses } = setup()

  client.connect()
  last().failWithoutClose()

  assert.equal(client.status, STATUS.RECONNECTING)
  timers.fire()
  assert.equal(FakeWebSocket.instances.length, 2)
  last().open()
  assert.equal(client.status, STATUS.OPEN)
  assert.deepEqual(statuses, [STATUS.CONNECTING, STATUS.RECONNECTING, STATUS.OPEN])
})

test('error seguido de close não agenda duas reconexões', () => {
  const { client, timers, last } = setup()

  client.connect()
  const socket = last()

  socket.failWithoutClose()
  socket.drop(1006)

  assert.equal(timers.timers.filter((t) => !t.cleared).length, 1)
})

test('error com o socket ainda aberto não derruba a conexão', () => {
  const { client, last } = setup()

  client.connect()
  last().open()
  last().readyState = 1
  last().onerror?.({})

  assert.equal(client.status, STATUS.OPEN)
})
