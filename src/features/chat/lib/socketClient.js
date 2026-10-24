// Cliente WebSocket do chat: uma conexão por aba, reconexão com backoff e tratamento do 4401.
// Não depende de Vue nem do navegador: WebSocket, timers e token são injetados (facilita testar).

export const CLOSE_UNAUTHORIZED = 4401
const OPEN_STATE = 1 // WebSocket.OPEN

export const STATUS = Object.freeze({
  IDLE: 'idle',
  CONNECTING: 'connecting',
  OPEN: 'open',
  RECONNECTING: 'reconnecting',
  UNAUTHORIZED: 'unauthorized',
  CLOSED: 'closed',
})

/** Atraso (ms) antes da tentativa `attempt` (0, 1, 2...): exponencial, com teto e jitter. */
export function backoffDelay(attempt, { base = 1000, max = 30_000, random = Math.random } = {}) {
  const exponential = Math.min(max, base * 2 ** attempt)

  return Math.round(exponential / 2 + random() * (exponential / 2))
}

export class ChatSocket {
  /**
   * @param {object} options
   * @param {() => string|null} options.getToken        token de acesso atual
   * @param {() => Promise<string|null>} [options.refreshToken]  renova o token (usado ao receber 4401)
   * @param {(token: string) => string} options.buildUrl URL do WebSocket para o token
   * @param {(event: object) => void} options.onEvent   evento JSON do servidor
   * @param {(status: string) => void} [options.onStatus]
   * @param {() => void} [options.onOpen]               chamado a cada (re)conexão
   * @param {typeof WebSocket} [options.WebSocketImpl]
   * @param {number} [options.stableAfterMs]            tempo aberto para considerar a conexão estável
   */
  constructor({
    getToken,
    refreshToken = null,
    buildUrl,
    onEvent,
    onStatus = () => {},
    onOpen = () => {},
    WebSocketImpl = globalThis.WebSocket,
    stableAfterMs = 5000,
    backoff = {},
    setTimeoutImpl = globalThis.setTimeout,
    clearTimeoutImpl = globalThis.clearTimeout,
  }) {
    Object.assign(this, {
      getToken,
      refreshToken,
      buildUrl,
      onEvent,
      onStatus,
      onOpen,
      WebSocketImpl,
      stableAfterMs,
      backoff,
    })
    // Embrulhados: guardar `setTimeout` nativo como método do objeto e chamá-lo daí dá
    // "Illegal invocation" no navegador (nos testes, com funções falsas, passaria despercebido).
    this.setTimeoutImpl = (fn, ms) => setTimeoutImpl(fn, ms)
    this.clearTimeoutImpl = (id) => clearTimeoutImpl(id)

    this.status = STATUS.IDLE
    this.socket = null
    this.attempt = 0
    this.reconnectTimer = null
    this.stableTimer = null
    this.refreshedSinceStable = false
    this.wantOpen = false
  }

  /** Abre a conexão (ignorado se já estiver aberta ou abrindo). */
  connect() {
    this.wantOpen = true

    if (this.socket) return

    this.#open()
  }

  /** Encerra de vez (logout, saída da tela). Não reconecta. */
  close() {
    this.wantOpen = false
    this.#clearTimers()

    const socket = this.socket

    this.socket = null

    if (socket) {
      detach(socket)

      try {
        socket.close(1000)
      } catch {
        // já fechado
      }
    }

    this.#setStatus(STATUS.CLOSED)
  }

  /** Tentativa manual (botão "tentar de novo"): zera o backoff e conecta já. */
  reconnectNow() {
    this.#clearTimers()
    this.attempt = 0
    this.refreshedSinceStable = false
    this.wantOpen = true

    if (this.socket) {
      const socket = this.socket

      this.socket = null
      detach(socket)

      try {
        socket.close(1000)
      } catch {
        // já fechado
      }
    }

    this.#open()
  }

  /** Envia um objeto JSON. Retorna false se não há conexão aberta. */
  send(payload) {
    if (!this.socket || this.status !== STATUS.OPEN) return false

    try {
      this.socket.send(JSON.stringify(payload))

      return true
    } catch {
      return false
    }
  }

  get isOpen() {
    return this.status === STATUS.OPEN
  }

  // ---- internos ----

  #open() {
    const token = this.getToken()

    if (!token) {
      this.#setStatus(STATUS.UNAUTHORIZED)

      return
    }

    this.#setStatus(this.attempt > 0 ? STATUS.RECONNECTING : STATUS.CONNECTING)

    let socket

    try {
      socket = new this.WebSocketImpl(this.buildUrl(token))
    } catch {
      this.#scheduleReconnect()

      return
    }

    this.socket = socket

    socket.onopen = () => {
      if (this.socket !== socket) return

      this.#setStatus(STATUS.OPEN)
      // O servidor aceita e só então fecha com 4401; só zera o backoff se a conexão se mantiver.
      this.stableTimer = this.setTimeoutImpl(() => {
        this.attempt = 0
        this.refreshedSinceStable = false
      }, this.stableAfterMs)
      this.onOpen()
    }

    socket.onmessage = (message) => {
      if (this.socket !== socket) return

      let data

      try {
        data = JSON.parse(message.data)
      } catch {
        return
      }

      if (data && typeof data === 'object' && !Array.isArray(data)) this.onEvent(data)
    }

    const handleClose = (event) => {
      if (this.socket !== socket) return

      this.socket = null
      this.#clearStableTimer()

      if (!this.wantOpen) {
        this.#setStatus(STATUS.CLOSED)

        return
      }

      if (event?.code === CLOSE_UNAUTHORIZED) {
        this.#handleUnauthorized()

        return
      }

      this.#scheduleReconnect()
    }

    socket.onclose = handleClose

    // Navegadores disparam `error` e depois `close` quando a conexão falha. Algumas implementações
    // (o WebSocket do Node 22, por exemplo) disparam só `error` e deixam o socket em CONNECTING para
    // sempre: sem este tratamento a reconexão nunca aconteceria. `error` com o socket ainda não aberto
    // significa "não conectou", então tratamos como queda. handleClose ignora chamadas repetidas.
    socket.onerror = () => {
      if (socket.readyState === OPEN_STATE) return

      handleClose({ code: 1006 })
      detach(socket)

      try {
        socket.close()
      } catch {
        // já fechado
      }
    }
  }

  async #handleUnauthorized() {
    // Uma única renovação por ciclo: se o servidor insistir em 4401, desiste em vez de entrar em loop.
    if (this.refreshToken && !this.refreshedSinceStable) {
      this.refreshedSinceStable = true

      const renewed = await Promise.resolve(this.refreshToken()).catch(() => null)

      if (!this.wantOpen) return

      if (renewed) {
        this.#open()

        return
      }
    }

    this.wantOpen = false
    this.#setStatus(STATUS.UNAUTHORIZED)
  }

  #scheduleReconnect() {
    this.#setStatus(STATUS.RECONNECTING)

    const delay = backoffDelay(this.attempt, this.backoff)

    this.attempt += 1
    this.reconnectTimer = this.setTimeoutImpl(() => {
      this.reconnectTimer = null

      if (this.wantOpen && !this.socket) this.#open()
    }, delay)
  }

  #setStatus(status) {
    if (this.status === status) return

    this.status = status
    this.onStatus(status)
  }

  #clearStableTimer() {
    if (this.stableTimer) this.clearTimeoutImpl(this.stableTimer)

    this.stableTimer = null
  }

  #clearTimers() {
    this.#clearStableTimer()

    if (this.reconnectTimer) this.clearTimeoutImpl(this.reconnectTimer)

    this.reconnectTimer = null
  }
}

function detach(socket) {
  socket.onopen = null
  socket.onmessage = null
  socket.onerror = null
  socket.onclose = null
}
