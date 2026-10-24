// Reconhecimento de fala do navegador (Web Speech API) com reinício automático.
// Sem Vue: a API do navegador, timers e relógio são injetados (testável com node --test).
//
// Limites do navegador: funciona bem no Chrome/Edge; transcreve o microfone padrão do sistema (não o escolhido
// na chamada) e, no Chrome, o áudio é enviado ao serviço de voz do Google para virar texto.

export const SPEECH = Object.freeze({
  IDLE: 'idle',
  LISTENING: 'listening',
  DENIED: 'denied',
  UNSUPPORTED: 'unsupported',
  ERROR: 'error',
})

const FATAL = new Set(['not-allowed', 'service-not-allowed', 'language-not-supported'])
const QUIET = new Set(['no-speech', 'aborted']) // acontecem normalmente: só reiniciam
const MAX_FAILURES = 8

export function recognitionConstructor(scope = globalThis) {
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null
}

export const recognitionSupported = (scope = globalThis) => !!recognitionConstructor(scope)

/** Espera antes de reiniciar: curta no uso normal, crescente (até 10 s) quando há erros em sequência. */
export function restartDelay(failures) {
  return failures ? Math.min(10_000, 500 * 2 ** (failures - 1)) : 150
}

export class SpeechTranscriber {
  /**
   * @param {object} options
   * @param {(text: string, durationMs: number) => void} options.onFinal  fala finalizada
   * @param {(text: string) => void} [options.onInterim]                  texto parcial ('' ao fechar a fala)
   * @param {(status: string) => void} [options.onStatus]
   * @param {string} [options.lang]
   */
  constructor({
    onFinal,
    onInterim = () => {},
    onStatus = () => {},
    lang = 'pt-BR',
    RecognitionImpl = recognitionConstructor(),
    setTimeoutImpl = (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimeoutImpl = (id) => globalThis.clearTimeout(id),
    now = () => Date.now(),
  }) {
    Object.assign(this, {
      onFinal,
      onInterim,
      onStatus,
      lang,
      RecognitionImpl,
      setTimeoutImpl,
      clearTimeoutImpl,
      now,
    })

    this.status = SPEECH.IDLE
    this.wanted = false
    this.recognition = null
    this.timer = null
    this.failures = 0
    this.utteranceStart = null
  }

  /** Começa a ouvir (e continua, reiniciando sozinho, até `stop()`). */
  start() {
    if (this.wanted) return

    if (!this.RecognitionImpl) {
      this.#setStatus(SPEECH.UNSUPPORTED)

      return
    }

    this.wanted = true
    this.failures = 0
    this.#begin()
  }

  /** Para de ouvir. A fala em andamento ainda pode ser entregue como final. */
  stop() {
    this.wanted = false
    this.#clearTimer()
    this.#end()

    if (this.status !== SPEECH.DENIED && this.status !== SPEECH.UNSUPPORTED) {
      this.#setStatus(SPEECH.IDLE)
    }
  }

  #begin() {
    this.#clearTimer()

    if (!this.wanted || this.recognition) return

    const recognition = new this.RecognitionImpl()

    recognition.lang = this.lang
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.onstart = () => {
      if (this.recognition === recognition) this.#setStatus(SPEECH.LISTENING)
    }
    recognition.onresult = (event) => this.#onResult(event)
    recognition.onerror = (event) => this.#onError(event, recognition)
    recognition.onend = () => this.#onEnd(recognition)
    this.recognition = recognition

    try {
      recognition.start()
    } catch {
      this.recognition = null
      this.#fail()
    }
  }

  #end() {
    const recognition = this.recognition

    if (!recognition) return

    try {
      recognition.stop()
    } catch {
      // já parado
    }
  }

  #onResult(event) {
    for (let index = event.resultIndex ?? 0; index < event.results.length; index += 1) {
      const result = event.results[index]
      const text = (result[0]?.transcript ?? '').replace(/\s+/g, ' ').trim()

      if (!text) continue

      this.failures = 0
      this.utteranceStart ??= this.now()

      if (result.isFinal) {
        const duration = this.now() - this.utteranceStart

        this.utteranceStart = null
        this.onInterim('')
        this.onFinal(text, Math.max(0, duration))
      } else {
        this.onInterim(text)
      }
    }
  }

  #onError(event, recognition) {
    if (this.recognition !== recognition) return

    const code = event?.error

    if (FATAL.has(code)) {
      this.wanted = false
      this.#setStatus(code === 'language-not-supported' ? SPEECH.ERROR : SPEECH.DENIED)

      return
    }

    if (!QUIET.has(code)) this.#fail()
  }

  #onEnd(recognition) {
    if (this.recognition !== recognition) return

    this.recognition = null
    this.utteranceStart = null
    this.onInterim('')

    if (!this.wanted) return

    this.timer = this.setTimeoutImpl(() => this.#begin(), restartDelay(this.failures))
  }

  #fail() {
    this.failures += 1

    if (this.failures >= MAX_FAILURES) {
      this.wanted = false
      this.#setStatus(SPEECH.ERROR)

      return
    }

    if (this.wanted && !this.recognition) {
      this.timer = this.setTimeoutImpl(() => this.#begin(), restartDelay(this.failures))
    }
  }

  #clearTimer() {
    if (this.timer !== null) this.clearTimeoutImpl(this.timer)

    this.timer = null
  }

  #setStatus(status) {
    if (this.status === status) return

    this.status = status
    this.onStatus(status)
  }
}
