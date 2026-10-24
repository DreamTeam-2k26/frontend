import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PeerMesh } from '../lib/peerMesh.js'

class FakeStream {
  constructor() {
    this.tracks = []
  }

  getTracks() {
    return [...this.tracks]
  }

  getAudioTracks() {
    return this.tracks.filter((track) => track.kind === 'audio')
  }

  addTrack(track) {
    this.tracks.push(track)
  }

  removeTrack(track) {
    this.tracks = this.tracks.filter((item) => item !== track)
  }
}

class FakePC {
  static instances = []

  constructor(config) {
    this.config = config
    this.transceivers = []
    this.remoteDescription = null
    this.localDescription = null
    this.candidates = []
    this.closed = false
    this.connectionState = 'new'
    this.offers = 0
    FakePC.instances.push(this)
  }

  addTransceiver(kind, init) {
    const transceiver = {
      kind,
      direction: init?.direction,
      sender: {
        track: null,
        async replaceTrack(track) {
          this.track = track
        },
      },
    }

    this.transceivers.push(transceiver)
    queueMicrotask(() => this.onnegotiationneeded?.())

    return transceiver
  }

  getTransceivers() {
    return this.transceivers
  }

  async createOffer(options) {
    this.offers += 1

    return { type: 'offer', sdp: `offer-${this.offers}`, restart: !!options?.iceRestart }
  }

  async createAnswer() {
    return { type: 'answer', sdp: 'answer' }
  }

  async setLocalDescription(description) {
    this.localDescription = description
  }

  async setRemoteDescription(description) {
    this.remoteDescription = description

    // Quem recebe uma oferta ganha os transceivers na mesma ordem do oferecedor.
    if (description.type === 'offer' && !this.transceivers.length) {
      ;['audio', 'video', 'video'].forEach((kind) =>
        this.transceivers.push({
          kind,
          direction: 'recvonly',
          sender: {
            track: null,
            async replaceTrack(track) {
              this.track = track
            },
          },
        }),
      )
    }
  }

  async addIceCandidate(candidate) {
    this.candidates.push(candidate)
  }

  close() {
    this.closed = true
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function build(overrides = {}) {
  FakePC.instances = []

  const sent = []
  const streams = []
  const statuses = []
  const local = {
    audio: { kind: 'audio', id: 'a' },
    camera: { kind: 'video', id: 'c' },
    screen: null,
  }
  const mesh = new PeerMesh({
    selfId: 1,
    iceServers: [{ urls: 'stun:x' }],
    send: (to, data) => sent.push({ to, data }),
    onStreams: (userId, value) => streams.push({ userId, value }),
    onStatus: (userId, status) => statuses.push({ userId, status }),
    getLocalTracks: () => local,
    RTCPeerConnectionImpl: FakePC,
    MediaStreamImpl: FakeStream,
    setTimeoutImpl: (fn) => {
      overrides.timers?.push(fn)

      return 1
    },
    clearTimeoutImpl: () => {},
  })

  return { mesh, sent, streams, statuses, local }
}

test('quem entra oferece: 3 transceivers (áudio, câmera, tela) e a oferta vai ao outro', async () => {
  const { mesh, sent, statuses } = build()

  mesh.connect(2)
  await flush()

  const [pc] = FakePC.instances

  assert.deepEqual(pc.config.iceServers, [{ urls: 'stun:x' }])
  assert.deepEqual(
    pc.getTransceivers().map((item) => item.kind),
    ['audio', 'video', 'video'],
  )
  assert.equal(sent.length, 1)
  assert.equal(sent[0].to, 2)
  assert.equal(sent[0].data.description.type, 'offer')
  assert.deepEqual(statuses[0], { userId: 2, status: 'connecting' })
})

test('trilhas locais vão para os transceivers certos e só trocam quando mudam', async () => {
  const { mesh, local } = build()

  mesh.connect(2)
  await flush()

  const [audio, camera, screen] = FakePC.instances[0].getTransceivers()

  assert.equal(audio.sender.track.id, 'a')
  assert.equal(camera.sender.track.id, 'c')
  assert.equal(screen.sender.track, null)
  local.camera = null
  local.screen = { kind: 'video', id: 's' }
  mesh.syncLocalTracks()
  await flush()
  assert.equal(camera.sender.track, null)
  assert.equal(screen.sender.track.id, 's')
})

test('quem recebe oferta responde, liga os transceivers e envia suas trilhas', async () => {
  const { mesh, sent } = build()

  await mesh.handleSignal(5, { description: { type: 'offer', sdp: 'o' } })

  const [pc] = FakePC.instances

  assert.equal(pc.remoteDescription.sdp, 'o')
  assert.ok(pc.getTransceivers().every((item) => item.direction === 'sendrecv'))
  assert.equal(pc.getTransceivers()[0].sender.track.id, 'a')
  assert.equal(sent.at(-1).data.description.type, 'answer')
  assert.equal(sent.at(-1).to, 5)
  // quem responde não gera oferta sozinho
  await flush()
  assert.equal(pc.offers, 0)
})

test('candidatos antes da descrição remota esperam e são aplicados depois', async () => {
  const { mesh } = build()

  mesh.connect(2)
  await flush()

  const [pc] = FakePC.instances

  await mesh.handleSignal(2, { candidate: { c: 1 } })
  assert.equal(pc.candidates.length, 0)
  await mesh.handleSignal(2, { description: { type: 'answer', sdp: 'ok' } })
  assert.deepEqual(pc.candidates, [{ c: 1 }])
  await mesh.handleSignal(2, { candidate: { c: 2 } })
  assert.equal(pc.candidates.length, 2)
})

test('trilhas remotas: câmera+áudio num stream e tela em outro, pela posição', async () => {
  const { mesh, streams } = build()

  mesh.connect(2)
  await flush()

  const [pc] = FakePC.instances
  const [audio, camera, screen] = pc.getTransceivers()

  pc.ontrack({ transceiver: audio, track: { kind: 'audio', id: 'ra' } })
  pc.ontrack({ transceiver: camera, track: { kind: 'video', id: 'rc' } })
  pc.ontrack({ transceiver: screen, track: { kind: 'video', id: 'rs' } })

  const { value } = streams.at(-1)

  assert.deepEqual(
    value.camera
      .getTracks()
      .map((track) => track.id)
      .sort(),
    ['ra', 'rc'],
  )
  assert.deepEqual(
    value.screen.getTracks().map((track) => track.id),
    ['rs'],
  )
  // trilha nova do mesmo tipo substitui a anterior
  pc.ontrack({ transceiver: camera, track: { kind: 'video', id: 'rc2' } })
  assert.deepEqual(
    value.camera
      .getTracks()
      .filter((track) => track.kind === 'video')
      .map((track) => track.id),
    ['rc2'],
  )
})

test('remover fecha a conexão e ignora sinais depois', async () => {
  const { mesh } = build()

  mesh.connect(2)
  await flush()
  mesh.remove(2)
  assert.equal(FakePC.instances[0].closed, true)
  assert.equal(mesh.has(2), false)
  await mesh.handleSignal(2, { candidate: { c: 1 } })
  assert.equal(FakePC.instances[0].candidates.length, 0)
})

test('falha de conexão: oferecedor reinicia o ICE; o outro lado pede o reinício', async () => {
  const { mesh, sent } = build()

  mesh.connect(2)
  await flush()

  const offerer = FakePC.instances[0]

  offerer.connectionState = 'failed'
  offerer.onconnectionstatechange()
  await flush()
  assert.equal(sent.at(-1).data.description.restart, true)

  await mesh.handleSignal(9, { description: { type: 'offer', sdp: 'o' } })

  const answerer = FakePC.instances[1]

  answerer.connectionState = 'failed'
  answerer.onconnectionstatechange()
  assert.deepEqual(sent.at(-1), { to: 9, data: { restart: true } })

  // o pedido de reinício só vale para quem ofereceu
  const before = offerer.offers

  await mesh.handleSignal(2, { restart: true })
  assert.equal(offerer.offers, before + 1)
  await mesh.handleSignal(9, { restart: true })
  assert.equal(answerer.offers, 0)
})

test('queda curta de rede espera antes de agir', async () => {
  const timers = []
  const { mesh, sent } = build({ timers })

  mesh.connect(2)
  await flush()

  const [pc] = FakePC.instances
  const sentBefore = sent.length

  pc.connectionState = 'disconnected'
  pc.onconnectionstatechange()
  assert.equal(sent.length, sentBefore)
  assert.equal(timers.length, 1)
  timers[0]()
  await flush()
  assert.equal(sent.length, sentBefore + 1)
})

test('closeAll fecha tudo e não aceita novas conexões', async () => {
  const { mesh } = build()

  mesh.connect(2)
  mesh.connect(3)
  await flush()
  mesh.closeAll()
  assert.ok(FakePC.instances.every((pc) => pc.closed))
  mesh.connect(4)
  assert.equal(FakePC.instances.length, 2)
})
