import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  nextSpeaking,
  rms,
  SPEAKING_HOLD_MS,
  SPEAKING_THRESHOLD,
  watchSpeaking,
} from '../lib/speaking.js'
import { callsSocketUrl } from '../lib/urls.js'
import { mediaErrorMessage } from '../lib/mediaErrors.js'

test('rms de silêncio, onda cheia e vazio', () => {
  assert.equal(rms([0, 0, 0]), 0)
  assert.equal(rms([]), 0)
  assert.ok(Math.abs(rms([1, -1, 1, -1]) - 1) < 1e-9)
})

test('falando liga na hora e só desliga depois do tempo de espera', () => {
  let state = { speaking: false, lastLoud: 0 }

  state = nextSpeaking(state, SPEAKING_THRESHOLD + 0.1, 1000)
  assert.equal(state.speaking, true)
  state = nextSpeaking(state, 0, 1000 + SPEAKING_HOLD_MS - 1)
  assert.equal(state.speaking, true)
  state = nextSpeaking(state, 0, 1000 + SPEAKING_HOLD_MS + 1)
  assert.equal(state.speaking, false)
})

test('watchSpeaking não faz nada sem áudio ou sem AudioContext', () => {
  const stop = watchSpeaking({ getAudioTracks: () => [] }, () => assert.fail('não deveria chamar'))

  assert.equal(typeof stop, 'function')
  stop()
  assert.equal(
    typeof watchSpeaking({ getAudioTracks: () => [{}] }, () => {}, { AudioContextImpl: null }),
    'function',
  )
})

test('URL do WebSocket das chamadas', () => {
  assert.equal(
    callsSocketUrl('tok en', null, 'http://localhost:8000/api/', 'http://x'),
    'ws://localhost:8000/ws/calls/?token=tok%20en',
  )
  assert.equal(
    callsSocketUrl('t', 12, 'https://api.exemplo.com/api', 'https://x'),
    'wss://api.exemplo.com/ws/calls/12/?token=t',
  )
})

test('mensagens de erro de mídia em português', () => {
  assert.match(mediaErrorMessage({ name: 'NotAllowedError' }, 'camera'), /^Câmera: .*bloqueou/)
  assert.match(
    mediaErrorMessage({ name: 'NotFoundError' }, 'mic'),
    /^Microfone: Nenhum dispositivo/,
  )
  assert.match(mediaErrorMessage({ name: 'NotReadableError' }, 'camera'), /em uso/)
  assert.match(mediaErrorMessage({ name: 'NotAllowedError' }, 'screen'), /cancelado/)
  assert.match(mediaErrorMessage(new Error('x'), 'mic'), /^Microfone: não foi possível/)
})
