import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  recognitionConstructor,
  recognitionSupported,
  restartDelay,
  SPEECH,
  SpeechTranscriber,
} from '../lib/speechRecognizer.js'

class FakeRecognition {
  static instances = []

  constructor() {
    this.started = false
    this.stopped = false
    FakeRecognition.instances.push(this)
  }

  start() {
    if (FakeRecognition.failStart) throw new Error('já iniciado')

    this.started = true
    queueMicrotask(() => this.onstart?.())
  }

  stop() {
    this.stopped = true
    queueMicrotask(() => this.onend?.())
  }

  // ajudantes de teste
  say(text, isFinal = true, index = 0) {
    this.onresult({ resultIndex: index, results: [{ 0: { transcript: text }, isFinal }] })
  }
}

function setup(options = {}) {
  FakeRecognition.instances = []
  FakeRecognition.failStart = false

  const timers = []
  const log = { finals: [], interims: [], statuses: [] }
  let clock = 1000
  const transcriber = new SpeechTranscriber({
    onFinal: (text, duration) => log.finals.push([text, duration]),
    onInterim: (text) => log.interims.push(text),
    onStatus: (status) => log.statuses.push(status),
    RecognitionImpl: FakeRecognition,
    setTimeoutImpl: (fn) => timers.push(fn) && timers.length,
    clearTimeoutImpl: (id) => {
      timers[id - 1] = null
    },
    now: () => clock,
    ...options,
  })
  const tick = (ms) => {
    clock += ms
  }
  const runTimers = () => timers.splice(0).forEach((fn) => fn?.())
  const last = () => FakeRecognition.instances.at(-1)

  return { transcriber, log, tick, runTimers, last }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

test('detecta suporte do navegador', () => {
  assert.equal(recognitionSupported({}), false)
  assert.equal(recognitionSupported({ webkitSpeechRecognition: FakeRecognition }), true)
  assert.equal(recognitionConstructor({ SpeechRecognition: FakeRecognition }), FakeRecognition)
})

test('sem suporte, start() avisa e não faz nada', () => {
  const { transcriber, log } = setup({ RecognitionImpl: null })

  transcriber.start()
  assert.deepEqual(log.statuses, [SPEECH.UNSUPPORTED])
})

test('entrega só falas finais, com duração, e mostra o texto parcial', async () => {
  const { transcriber, log, tick, last } = setup()

  transcriber.start()
  await flush()
  assert.equal(transcriber.status, SPEECH.LISTENING)
  assert.equal(last().continuous, true)
  assert.equal(last().interimResults, true)
  assert.equal(last().lang, 'pt-BR')

  last().say('bom', false)
  tick(1500)
  last().say('bom dia pessoal', true)
  assert.deepEqual(log.finals, [['bom dia pessoal', 1500]])
  assert.deepEqual(log.interims, ['bom', ''])
})

test('ignora resultados vazios e normaliza espaços', async () => {
  const { transcriber, log, last } = setup()

  transcriber.start()
  await flush()
  last().say('   ', true)
  last().say('  olá    mundo ', true)
  assert.deepEqual(
    log.finals.map(([text]) => text),
    ['olá mundo'],
  )
})

test('reinicia sozinho quando o navegador encerra o reconhecimento', async () => {
  const { transcriber, runTimers, last } = setup()

  transcriber.start()
  await flush()

  const first = last()

  first.onend()
  assert.equal(FakeRecognition.instances.length, 1)
  runTimers()
  await flush()
  assert.equal(FakeRecognition.instances.length, 2)
  assert.notEqual(last(), first)
  assert.equal(transcriber.status, SPEECH.LISTENING)
})

test('stop() não reinicia e volta a ocioso', async () => {
  const { transcriber, runTimers } = setup()

  transcriber.start()
  await flush()
  transcriber.stop()
  await flush()
  runTimers()
  await flush()
  assert.equal(FakeRecognition.instances.length, 1)
  assert.equal(transcriber.status, SPEECH.IDLE)
})

test('permissão negada para de vez e informa', async () => {
  const { transcriber, runTimers, last } = setup()

  transcriber.start()
  await flush()
  last().onerror({ error: 'not-allowed' })
  last().onend()
  runTimers()
  await flush()
  assert.equal(transcriber.status, SPEECH.DENIED)
  assert.equal(FakeRecognition.instances.length, 1)
})

test('silêncio (no-speech) só reinicia, sem contar como falha', async () => {
  const { transcriber, runTimers, last } = setup()

  transcriber.start()
  await flush()
  last().onerror({ error: 'no-speech' })
  last().onend()
  assert.equal(transcriber.failures, 0)
  runTimers()
  await flush()
  assert.equal(FakeRecognition.instances.length, 2)
})

test('erros seguidos aumentam a espera e, depois de muitos, desistem', async () => {
  const { transcriber, runTimers, last } = setup()

  assert.equal(restartDelay(0), 150)
  assert.equal(restartDelay(1), 500)
  assert.equal(restartDelay(3), 2000)
  assert.equal(restartDelay(20), 10_000)

  transcriber.start()
  await flush()

  for (let index = 0; index < 8; index += 1) {
    last().onerror({ error: 'network' })
    last().onend()
    runTimers()
    await flush()
  }

  assert.equal(transcriber.status, SPEECH.ERROR)
  const count = FakeRecognition.instances.length

  runTimers()
  await flush()
  assert.equal(FakeRecognition.instances.length, count)
})

test('uma fala reconhecida zera a contagem de falhas', async () => {
  const { transcriber, last } = setup()

  transcriber.start()
  await flush()
  last().onerror({ error: 'network' })
  assert.equal(transcriber.failures, 1)
  last().say('voltou', true)
  assert.equal(transcriber.failures, 0)
})

test('falha ao iniciar não derruba: tenta de novo mais tarde', async () => {
  const { transcriber, runTimers } = setup()

  FakeRecognition.failStart = true
  transcriber.start()
  assert.equal(transcriber.failures, 1)
  FakeRecognition.failStart = false
  runTimers()
  await flush()
  assert.equal(transcriber.status, SPEECH.LISTENING)
})
