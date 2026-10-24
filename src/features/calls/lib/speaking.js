// Detecção de quem está falando a partir do volume do áudio (sem enviar nada pela rede).

export const SPEAKING_THRESHOLD = 0.035
export const SPEAKING_HOLD_MS = 450

/** Volume (RMS 0..1) de um bloco de amostras de -1..1 (Float32Array ou array). */
export function rms(samples) {
  if (!samples?.length) return 0

  let sum = 0

  for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i]

  return Math.sqrt(sum / samples.length)
}

/**
 * Suaviza o "falando": liga na hora que passa do limite e só desliga depois de `holdMs` abaixo dele,
 * para o destaque não piscar entre sílabas. Estado puro: devolve o novo estado.
 */
export function nextSpeaking(
  state,
  level,
  now,
  { threshold = SPEAKING_THRESHOLD, holdMs = SPEAKING_HOLD_MS } = {},
) {
  if (level >= threshold) return { speaking: true, lastLoud: now }

  if (state.speaking && now - state.lastLoud < holdMs) return state

  return { speaking: false, lastLoud: state.lastLoud }
}

/**
 * Observa o áudio de um MediaStream e chama `onChange(boolean)` quando muda quem fala.
 * Devolve uma função que para a observação. Sem trilha de áudio ou sem AudioContext, não faz nada.
 */
export function watchSpeaking(
  stream,
  onChange,
  { AudioContextImpl = globalThis.AudioContext, intervalMs = 120 } = {},
) {
  if (!AudioContextImpl || !stream?.getAudioTracks?.().length) return () => {}

  let context
  let source
  let timer

  try {
    context = new AudioContextImpl()
    source = context.createMediaStreamSource(stream)

    const analyser = context.createAnalyser()

    analyser.fftSize = 512
    source.connect(analyser)

    const samples = new Float32Array(analyser.fftSize)
    let state = { speaking: false, lastLoud: 0 }

    timer = setInterval(() => {
      analyser.getFloatTimeDomainData(samples)

      const next = nextSpeaking(state, rms(samples), Date.now())

      if (next.speaking !== state.speaking) onChange(next.speaking)

      state = next
    }, intervalMs)
  } catch {
    return () => {}
  }

  return () => {
    clearInterval(timer)

    try {
      source?.disconnect()
      context?.close().catch(() => {})
    } catch {
      // contexto já fechado
    }
  }
}
