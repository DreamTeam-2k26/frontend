import { computed, onBeforeUnmount, reactive, ref, shallowRef } from 'vue'
import { refreshAccessToken } from '@/api/session'
import { getAccessToken } from '@/utils/token'
import { ChatSocket, STATUS } from '../../chat/lib/socketClient'
import { PeerMesh } from '../lib/peerMesh'
import { watchSpeaking } from '../lib/speaking'
import { mergeSegments } from '../lib/transcript'
import { callsSocketUrl } from '../lib/urls'

// Sala de uma chamada: WebSocket de sinalização + malha WebRTC + estado de cada participante.
// `media` é o LocalMedia já criado na pré-entrada (câmera/microfone escolhidos pelo usuário).

export const PHASE = Object.freeze({
  CONNECTING: 'connecting',
  LIVE: 'live',
  ENDED: 'ended',
  DENIED: 'denied',
  REPLACED: 'replaced',
  LEFT: 'left',
})

const EMPTY_STATE = { mic: false, camera: false, screen: false, hand: false }
const MAX_PENDING_SEGMENTS = 50 // falas guardadas enquanto a conexão está fora

export function useCallRoom({ callId, media }) {
  const phase = ref(PHASE.CONNECTING)
  const error = ref('')
  const connection = ref(STATUS.CONNECTING)
  const selfId = ref(null)
  const peers = reactive({})
  const hand = ref(false)
  const selfSpeaking = ref(false)
  const mediaRev = ref(0)
  const localCameraStream = shallowRef(null)
  const localScreenStream = shallowRef(null)
  const transcriptionOn = ref(false)
  const transcriptionBy = ref(null)
  const welcomes = ref(0) // quantas vezes o servidor nos deu boas-vindas (1 + reconexões)
  const segments = shallowRef([])

  let socket = null
  let mesh = null
  let stopSelfSpeaking = () => {}
  let unsubscribe = () => {}
  const stopPeerSpeaking = new Map()
  let pendingSegments = []

  const peerList = computed(() =>
    Object.values(peers).sort((a, b) => a.joinedOrder - b.joinedOrder),
  )
  let order = 0

  function localTracks() {
    return {
      audio: media.audioTrack,
      camera: media.cameraOn ? media.videoTrack : null,
      screen: media.screenOn ? media.screenTrack : null,
    }
  }

  function localState() {
    return {
      mic: media.micOn,
      camera: media.cameraOn,
      screen: media.screenOn,
      hand: hand.value,
      screen_stream: '',
    }
  }

  function sendState() {
    socket?.send({ action: 'state', state: localState() })
  }

  function rebuildLocalStreams() {
    localCameraStream.value =
      media.cameraOn && media.videoTrack ? new MediaStream([media.videoTrack]) : null
    localScreenStream.value =
      media.screenOn && media.screenTrack ? new MediaStream([media.screenTrack]) : null
    mediaRev.value += 1

    stopSelfSpeaking()
    selfSpeaking.value = false

    if (media.micOn && media.audioTrack) {
      stopSelfSpeaking = watchSpeaking(new MediaStream([media.audioTrack]), (value) => {
        selfSpeaking.value = value
      })
    }
  }

  function onLocalChange({ kind }) {
    if (kind === 'devices') return

    rebuildLocalStreams()
    mesh?.syncLocalTracks()
    sendState()
  }

  function addPeer(info) {
    peers[info.user] = reactive({
      user: info.user,
      name: info.name,
      avatar: info.avatar ?? null,
      state: { ...EMPTY_STATE, ...info.state },
      streams: null,
      rev: 0,
      status: 'connecting',
      speaking: false,
      joinedOrder: order++,
    })
  }

  function dropPeer(userId) {
    mesh?.remove(userId)
    stopPeerSpeaking.get(userId)?.()
    stopPeerSpeaking.delete(userId)
    delete peers[userId]
  }

  function onStreams(userId, streams) {
    const peer = peers[userId]

    if (!peer) return

    peer.streams = streams
    peer.rev += 1

    if (!stopPeerSpeaking.has(userId) && streams.camera.getAudioTracks().length) {
      stopPeerSpeaking.set(
        userId,
        watchSpeaking(streams.camera, (value) => {
          if (peers[userId]) peers[userId].speaking = value
        }),
      )
    }
  }

  function resetMesh(iceServers) {
    mesh?.closeAll()
    stopPeerSpeaking.forEach((stop) => stop())
    stopPeerSpeaking.clear()
    Object.keys(peers).forEach((key) => delete peers[key])
    mesh = new PeerMesh({
      selfId: selfId.value,
      iceServers,
      getLocalTracks: localTracks,
      send: (to, data) => socket?.send({ action: 'signal', to, data }),
      onStreams,
      onStatus: (userId, status) => {
        if (peers[userId]) peers[userId].status = status
      },
    })
  }

  function handleEvent(event) {
    switch (event.type) {
      case 'welcome':
        selfId.value = event.you
        resetMesh(event.ice_servers)
        event.peers.forEach((info) => {
          addPeer(info)
          mesh.connect(info.user)
        })
        phase.value = PHASE.LIVE
        transcriptionOn.value = !!event.transcription
        transcriptionBy.value = null
        welcomes.value += 1
        rebuildLocalStreams()
        sendState()
        flushSegments()
        break
      case 'peer.joined':
        if (!peers[event.peer.user]) addPeer(event.peer)
        break
      case 'peer.left':
        dropPeer(event.user)
        break
      case 'peer.state':
        if (peers[event.user]) peers[event.user].state = { ...EMPTY_STATE, ...event.state }
        break
      case 'signal':
        mesh?.handleSignal(event.from, event.data)
        break
      case 'transcription.changed':
        transcriptionBy.value = event.by ?? null
        transcriptionOn.value = !!event.enabled
        break
      case 'transcript.segment':
        segments.value = mergeSegments(segments.value, [event.segment])
        break
      case 'call.ended':
        finish(PHASE.ENDED)
        break
      case 'replaced':
        finish(PHASE.REPLACED)
        break
      case 'error':
        error.value = event.message || 'Não foi possível entrar na chamada.'
        finish(PHASE.DENIED)
        break
    }
  }

  /** Envia uma fala transcrita; se a conexão caiu, guarda e reenvia ao reconectar (o servidor ignora repetidas). */
  function sendTranscript(payload) {
    const message = { action: 'transcript', ...payload }

    if (socket?.send(message)) return

    pendingSegments = [...pendingSegments, message].slice(-MAX_PENDING_SEGMENTS)
  }

  function flushSegments() {
    const waiting = pendingSegments

    pendingSegments = []
    waiting.forEach((message) => sendTranscript(message))
  }

  /** Acrescenta falas já guardadas (histórico carregado pela API) às recebidas ao vivo. */
  function addSegments(list) {
    segments.value = mergeSegments(segments.value, list)
  }

  function cleanup() {
    unsubscribe()
    stopSelfSpeaking()
    stopPeerSpeaking.forEach((stop) => stop())
    stopPeerSpeaking.clear()
    mesh?.closeAll()
    mesh = null
    socket?.close()
    socket = null
  }

  function finish(next) {
    phase.value = next
    cleanup()
  }

  function join() {
    unsubscribe = media.subscribe(onLocalChange)
    socket = new ChatSocket({
      getToken: getAccessToken,
      refreshToken: refreshAccessToken,
      buildUrl: (token) => callsSocketUrl(token, callId),
      onEvent: handleEvent,
      onStatus: (status) => {
        connection.value = status

        if (status === STATUS.UNAUTHORIZED) {
          error.value = 'Sua sessão expirou. Entre novamente.'
          finish(PHASE.DENIED)
        }
      },
    })
    socket.connect()
  }

  function leave() {
    socket?.send({ action: 'leave' })
    finish(PHASE.LEFT)
  }

  const toggleMic = () => media.setMic(!media.micOn)
  const toggleCamera = () => media.setCamera(!media.cameraOn)
  const toggleScreen = () => (media.screenOn ? media.stopScreen() : media.startScreen())

  function toggleHand() {
    hand.value = !hand.value
    sendState()
  }

  onBeforeUnmount(() => {
    if (phase.value === PHASE.LIVE || phase.value === PHASE.CONNECTING) leave()
  })

  return {
    phase,
    error,
    connection,
    selfId,
    peers: peerList,
    hand,
    selfSpeaking,
    mediaRev,
    localCameraStream,
    localScreenStream,
    transcriptionOn,
    transcriptionBy,
    welcomes,
    segments,
    sendTranscript,
    addSegments,
    join,
    leave,
    toggleMic,
    toggleCamera,
    toggleScreen,
    toggleHand,
  }
}
