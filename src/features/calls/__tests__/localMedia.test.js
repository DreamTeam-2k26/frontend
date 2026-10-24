import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LocalMedia } from '../lib/localMedia.js'

function fakeTrack(kind) {
  return {
    kind,
    enabled: true,
    readyState: 'live',
    stopped: false,
    stop() {
      this.stopped = true
      this.readyState = 'ended'
    },
  }
}

function fakeDevices({ failMic = false, failCamera = false, failScreen = false } = {}) {
  const calls = []

  return {
    calls,
    async getUserMedia(constraints) {
      calls.push(constraints)

      if (constraints.audio) {
        if (failMic) throw Object.assign(new Error('x'), { name: 'NotAllowedError' })

        return { getAudioTracks: () => [fakeTrack('audio')], getVideoTracks: () => [] }
      }

      if (failCamera) throw Object.assign(new Error('x'), { name: 'NotFoundError' })

      return { getAudioTracks: () => [], getVideoTracks: () => [fakeTrack('video')] }
    },
    async getDisplayMedia() {
      if (failScreen) throw Object.assign(new Error('x'), { name: 'NotAllowedError' })

      return { getVideoTracks: () => [fakeTrack('video')] }
    },
    async enumerateDevices() {
      return [
        { kind: 'audioinput', deviceId: 'm1', label: 'Mic 1' },
        { kind: 'videoinput', deviceId: 'c1', label: '' },
        { kind: 'audiooutput', deviceId: 's1', label: 'Alto-falante' },
        { kind: 'videoinput', deviceId: '', label: 'sem permissão' },
      ]
    },
  }
}

test('negar a câmera não derruba o microfone', async () => {
  const media = new LocalMedia({ mediaDevices: fakeDevices({ failCamera: true }) })

  await media.start()
  assert.equal(media.micOn, true)
  assert.equal(media.cameraOn, false)
  assert.match(media.errors.camera, /^Câmera:/)
  assert.equal(media.errors.mic, '')
})

test('mutar só desabilita a trilha; religar reaproveita a mesma', async () => {
  const media = new LocalMedia({ mediaDevices: fakeDevices() })

  await media.setMic(true)

  const track = media.audioTrack

  await media.setMic(false)
  assert.equal(track.enabled, false)
  assert.equal(media.micOn, false)
  await media.setMic(true)
  assert.equal(media.audioTrack, track)
  assert.equal(track.enabled, true)
})

test('desligar a câmera solta o dispositivo', async () => {
  const media = new LocalMedia({ mediaDevices: fakeDevices() })

  await media.setCamera(true)

  const track = media.videoTrack

  await media.setCamera(false)
  assert.equal(track.stopped, true)
  assert.equal(media.videoTrack, null)
  assert.equal(media.cameraOn, false)
})

test('lista dispositivos ignorando os sem id e dá nome padrão sem rótulo', async () => {
  const media = new LocalMedia({ mediaDevices: fakeDevices() })

  await media.refreshDevices()
  assert.deepEqual(media.devices.mic, [{ id: 'm1', label: 'Mic 1' }])
  assert.equal(media.devices.camera.length, 1)
  assert.match(media.devices.camera[0].label, /camera/)
  assert.equal(media.devices.speaker.length, 1)
})

test('trocar de dispositivo pede o deviceId escolhido e mantém mudo como estava', async () => {
  const devices = fakeDevices()
  const media = new LocalMedia({ mediaDevices: devices })

  await media.setMic(true)
  await media.setMic(false)
  await media.selectDevice('mic', 'm1')
  assert.deepEqual(devices.calls.at(-1).audio.deviceId, { exact: 'm1' })
  assert.equal(media.micOn, false)
  assert.equal(media.audioTrack.enabled, false)
})

test('compartilhar tela: liga, para e erro amigável', async () => {
  const media = new LocalMedia({ mediaDevices: fakeDevices() })

  await media.startScreen()
  assert.equal(media.screenOn, true)

  const track = media.screenTrack

  media.stopScreen()
  assert.equal(track.stopped, true)
  assert.equal(media.screenOn, false)

  const denied = new LocalMedia({ mediaDevices: fakeDevices({ failScreen: true }) })

  await denied.startScreen()
  assert.equal(denied.screenOn, false)
  assert.match(denied.errors.screen, /cancelado/)
})

test('o usuário fechar o compartilhamento pelo navegador desliga a tela', async () => {
  const media = new LocalMedia({ mediaDevices: fakeDevices() })

  await media.startScreen()
  media.screenTrack.onended()
  assert.equal(media.screenOn, false)
})

test('vários ouvintes recebem as mudanças e podem cancelar', async () => {
  const media = new LocalMedia({ mediaDevices: fakeDevices() })
  const seen = []
  const off = media.subscribe((change) => seen.push(change.kind))

  await media.setMic(true)
  off()
  await media.setMic(false)
  assert.deepEqual(seen, ['mic'])
})

test('stopAll solta tudo e impede religar', async () => {
  const media = new LocalMedia({ mediaDevices: fakeDevices() })

  await media.start()

  const tracks = [media.audioTrack, media.videoTrack]

  media.stopAll()
  assert.ok(tracks.every((track) => track.stopped))
  await media.setMic(true)
  assert.equal(media.micOn, false)
})
