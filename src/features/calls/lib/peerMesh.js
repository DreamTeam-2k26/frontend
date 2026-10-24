// Malha de conexões WebRTC (todos com todos). Sem Vue nem navegador: o RTCPeerConnection é injetado.
//
// Regras que evitam conflito de negociação:
// - Só quem ENTRA na chamada cria a oferta para cada pessoa que já estava; os demais só respondem.
// - Cada conexão nasce com 3 "transceivers" fixos, sempre nesta ordem: 0 áudio, 1 câmera, 2 tela.
//   Ligar/desligar câmera, microfone ou tela só troca a trilha (replaceTrack), sem renegociar,
//   e o receptor sabe qual é qual pela posição do transceiver.

export const SLOT = Object.freeze({ AUDIO: 0, CAMERA: 1, SCREEN: 2 })
const SLOT_KINDS = ['audio', 'video', 'video']
const DISCONNECTED_GRACE_MS = 6000

export class PeerMesh {
  /**
   * @param {object} options
   * @param {number} options.selfId
   * @param {object[]} options.iceServers
   * @param {(to: number, data: object) => void} options.send     envia sinalização ao outro participante
   * @param {(userId: number, streams: {camera: MediaStream, screen: MediaStream}) => void} options.onStreams  chegou/trocou trilha remota
   * @param {(userId: number, status: string) => void} [options.onStatus]  connecting | connected | failed
   * @param {() => {audio: MediaStreamTrack|null, camera: MediaStreamTrack|null, screen: MediaStreamTrack|null}} options.getLocalTracks
   * @param {typeof RTCPeerConnection} [options.RTCPeerConnectionImpl]
   * @param {typeof MediaStream} [options.MediaStreamImpl]
   */
  constructor({
    selfId,
    iceServers,
    send,
    onStreams,
    onStatus = () => {},
    getLocalTracks,
    RTCPeerConnectionImpl = globalThis.RTCPeerConnection,
    MediaStreamImpl = globalThis.MediaStream,
    setTimeoutImpl = globalThis.setTimeout,
    clearTimeoutImpl = globalThis.clearTimeout,
  }) {
    Object.assign(this, {
      selfId,
      iceServers,
      send,
      onStreams,
      onStatus,
      getLocalTracks,
      RTCPeerConnectionImpl,
      MediaStreamImpl,
    })
    // Embrulhados: chamar `setTimeout` nativo como método de outro objeto dá "Illegal invocation" no navegador.
    this.setTimeoutImpl = (fn, ms) => setTimeoutImpl(fn, ms)
    this.clearTimeoutImpl = (id) => clearTimeoutImpl(id)
    this.peers = new Map()
    this.closed = false
  }

  has(userId) {
    return this.peers.has(userId)
  }

  /** Começa uma conexão como quem OFERECE (use para quem já estava na chamada quando você entrou). */
  connect(userId) {
    if (this.closed || this.peers.has(userId)) return

    this.#create(userId, true)
  }

  /** Processa sinalização recebida de `userId` (oferta, resposta, candidato ICE ou pedido de reinício). */
  async handleSignal(userId, data) {
    if (this.closed || !data || typeof data !== 'object') return

    if (data.restart) {
      const peer = this.peers.get(userId)

      if (peer?.initiator) await this.#offer(userId, { iceRestart: true })

      return
    }

    if (data.description) return this.#handleDescription(userId, data.description)

    if (data.candidate !== undefined) return this.#handleCandidate(userId, data.candidate)
  }

  /** Fecha a conexão com uma pessoa (ela saiu). */
  remove(userId) {
    const peer = this.peers.get(userId)

    if (!peer) return

    this.clearTimeoutImpl(peer.graceTimer)
    peer.pc.onicecandidate = peer.pc.ontrack = peer.pc.onnegotiationneeded = null
    peer.pc.onconnectionstatechange = null

    try {
      peer.pc.close()
    } catch {
      // já fechada
    }

    this.peers.delete(userId)
  }

  /** Reaplica as trilhas locais em todas as conexões (ligou/desligou/trocou câmera, mic ou tela). */
  syncLocalTracks() {
    this.peers.forEach((peer) => this.#attachLocal(peer))
  }

  closeAll() {
    this.closed = true
    ;[...this.peers.keys()].forEach((userId) => this.remove(userId))
  }

  // ---- internos ----

  #create(userId, initiator) {
    const pc = new this.RTCPeerConnectionImpl({ iceServers: this.iceServers })
    const peer = {
      pc,
      initiator,
      pending: [],
      graceTimer: null,
      streams: { camera: new this.MediaStreamImpl(), screen: new this.MediaStreamImpl() },
    }

    this.peers.set(userId, peer)
    this.onStatus(userId, 'connecting')

    pc.onicecandidate = (event) => {
      if (event.candidate) this.send(userId, { candidate: event.candidate })
    }
    pc.ontrack = (event) => this.#onTrack(userId, peer, event)
    pc.onconnectionstatechange = () => this.#onState(userId, peer)

    if (initiator) {
      SLOT_KINDS.forEach((kind) => pc.addTransceiver(kind, { direction: 'sendrecv' }))
      this.#attachLocal(peer)
      // O navegador dispara a negociação sozinho depois de criar os transceivers.
      pc.onnegotiationneeded = () => this.#offer(userId)
    }

    return peer
  }

  async #offer(userId, { iceRestart = false } = {}) {
    const peer = this.peers.get(userId)

    if (!peer || peer.offering) return

    peer.offering = true

    try {
      const offer = await peer.pc.createOffer(iceRestart ? { iceRestart: true } : undefined)

      await peer.pc.setLocalDescription(offer)
      this.send(userId, { description: peer.pc.localDescription })
    } catch {
      this.onStatus(userId, 'failed')
    } finally {
      peer.offering = false
    }
  }

  async #handleDescription(userId, description) {
    let peer = this.peers.get(userId)

    if (description.type === 'offer') {
      peer ??= this.#create(userId, false)

      try {
        await peer.pc.setRemoteDescription(description)
        peer.pc.getTransceivers().forEach((transceiver) => {
          transceiver.direction = 'sendrecv'
        })
        this.#attachLocal(peer)

        const answer = await peer.pc.createAnswer()

        await peer.pc.setLocalDescription(answer)
        this.send(userId, { description: peer.pc.localDescription })
        await this.#flush(peer)
      } catch {
        this.onStatus(userId, 'failed')
      }

      return
    }

    if (!peer) return

    try {
      await peer.pc.setRemoteDescription(description)
      await this.#flush(peer)
    } catch {
      this.onStatus(userId, 'failed')
    }
  }

  async #handleCandidate(userId, candidate) {
    const peer = this.peers.get(userId)

    if (!peer) return

    // Candidato antes da descrição remota: guarda e aplica depois.
    if (!peer.pc.remoteDescription) {
      peer.pending.push(candidate)

      return
    }

    try {
      await peer.pc.addIceCandidate(candidate)
    } catch {
      // candidato obsoleto: ignorar
    }
  }

  async #flush(peer) {
    const queued = peer.pending.splice(0)

    for (const candidate of queued) {
      try {
        await peer.pc.addIceCandidate(candidate)
      } catch {
        // candidato obsoleto: ignorar
      }
    }
  }

  #attachLocal(peer) {
    const tracks = this.getLocalTracks()
    const list = [tracks.audio, tracks.camera, tracks.screen]

    peer.pc.getTransceivers().forEach((transceiver, index) => {
      if (index > SLOT.SCREEN) return

      const track = list[index] ?? null

      if (transceiver.sender.track === track) return

      transceiver.sender.replaceTrack(track).catch(() => {})
    })
  }

  #onTrack(userId, peer, event) {
    const index = peer.pc.getTransceivers().indexOf(event.transceiver)
    const target = index === SLOT.SCREEN ? peer.streams.screen : peer.streams.camera

    if (index < 0 || index > SLOT.SCREEN) return

    // Troca a trilha anterior do mesmo tipo (uma câmera e um áudio no máximo por stream).
    target
      .getTracks()
      .filter((track) => track.kind === event.track.kind)
      .forEach((track) => target.removeTrack(track))
    target.addTrack(event.track)
    this.onStreams(userId, peer.streams)
  }

  #onState(userId, peer) {
    const state = peer.pc.connectionState

    this.clearTimeoutImpl(peer.graceTimer)

    if (state === 'connected') {
      this.onStatus(userId, 'connected')

      return
    }

    if (state === 'disconnected') {
      // Quedas rápidas de rede se recuperam sozinhas; só age se persistir.
      peer.graceTimer = this.setTimeoutImpl(
        () => this.#recover(userId, peer),
        DISCONNECTED_GRACE_MS,
      )

      return
    }

    if (state === 'failed') this.#recover(userId, peer)
  }

  #recover(userId, peer) {
    if (this.closed || this.peers.get(userId) !== peer) return

    this.onStatus(userId, 'connecting')

    if (peer.initiator) this.#offer(userId, { iceRestart: true })
    else this.send(userId, { restart: true })
  }
}
