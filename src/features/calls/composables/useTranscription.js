import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { toast } from 'vue3-toastify'
import { apiErrorMessage } from '../../chat/lib/errors'
import { recognitionSupported, SPEECH, SpeechTranscriber } from '../lib/speechRecognizer'
import { getTranscript, setTranscription } from '../services/callsApi'
import { PHASE } from './useCallRoom'

// Transcrição de uma chamada em andamento. Cada pessoa transcreve o próprio microfone no navegador (só enquanto
// a transcrição estiver ligada, a pessoa na chamada e o microfone aberto) e o servidor devolve as falas a todos.
// `room` é o retorno (reativo) de useCallRoom; `view`, o espelho de useLocalMedia.

let counter = 0
const newId = () =>
  `${Date.now().toString(36)}-${(counter += 1)}-${Math.random().toString(36).slice(2, 6)}`

export function useTranscription({ callId, room, view }) {
  const supported = recognitionSupported()
  const status = ref(supported ? SPEECH.IDLE : SPEECH.UNSUPPORTED)
  const interim = ref('')
  const busy = ref(false)
  const problem = ref('')
  let active = true

  const transcriber = new SpeechTranscriber({
    onFinal: (text, durationMs) =>
      room.sendTranscript({ text, duration_ms: durationMs, client_id: newId() }),
    onInterim: (text) => {
      interim.value = text
    },
    onStatus: (value) => {
      status.value = value
    },
  })

  const listening = computed(() => status.value === SPEECH.LISTENING)
  const enabled = computed(() => room.transcriptionOn)
  // Só ouve com a transcrição ligada, dentro da chamada e com o microfone aberto: mudo = nada é transcrito.
  const shouldListen = computed(
    () => supported && room.phase === PHASE.LIVE && room.transcriptionOn && view.micOn,
  )

  watch(
    shouldListen,
    (value) => {
      if (value) transcriber.start()
      else transcriber.stop()
    },
    { immediate: true },
  )

  async function loadBacklog() {
    try {
      const data = await getTranscript(callId)

      if (active) room.addSegments(data.segments)
    } catch {
      // o ao vivo continua funcionando; o histórico completo fica disponível depois
    }
  }

  // Ao entrar (e ao reconectar) busca o que foi dito antes, para o painel começar completo.
  watch(
    () => room.welcomes,
    (value) => value && loadBacklog(),
    { immediate: true },
  )

  function nameOf(userId) {
    if (userId === room.selfId) return 'Você'

    return room.peers.find((peer) => peer.user === userId)?.name ?? 'Alguém'
  }

  watch(
    () => room.transcriptionOn,
    (value, previous) => {
      if (room.phase !== PHASE.LIVE) return

      const by = room.transcriptionBy

      if (value && by !== null) {
        toast.info(
          `${nameOf(by)} ligou a transcrição. O que você disser com o microfone aberto será transcrito e ficará salvo para o projeto.`,
          { autoClose: 8000 },
        )
      } else if (!value && previous && by !== null) {
        toast.info(`${nameOf(by)} desligou a transcrição.`)
      }
    },
  )

  // Quem entra com a transcrição já ligada precisa saber disso.
  watch(
    () => room.welcomes,
    (value) => {
      if (value === 1 && room.transcriptionOn) {
        toast.info('Esta reunião está sendo transcrita enquanto seu microfone estiver aberto.', {
          autoClose: 8000,
        })
      }
    },
  )

  async function toggle() {
    if (busy.value) return

    busy.value = true
    problem.value = ''

    try {
      const data = await setTranscription(callId, !room.transcriptionOn)

      room.transcriptionOn = !!data.transcription_on
    } catch (error) {
      problem.value = apiErrorMessage(error, 'Não foi possível alterar a transcrição.')
    } finally {
      busy.value = false
    }
  }

  onBeforeUnmount(() => {
    active = false
    transcriber.stop()
  })

  return { supported, status, listening, enabled, interim, busy, problem, toggle }
}
