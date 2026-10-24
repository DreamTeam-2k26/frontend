// Câmera, microfone e tela locais. Cada tipo é independente: negar a câmera não derruba o microfone.
// Sem Vue: `mediaDevices` e `onChange` são injetados (testável com um falso).

import { mediaErrorMessage } from './mediaErrors.js'

const AUDIO = { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
const VIDEO = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }

const kindOf = (device) =>
  ({ audioinput: 'mic', videoinput: 'camera', audiooutput: 'speaker' })[device.kind]

export class LocalMedia {
  /**
   * @param {object} [options]
   * @param {MediaDevices} [options.mediaDevices]
   * @param {(change: {kind: string}) => void} [options.onChange]  trilha trocada/ligada/desligada ("mic" | "camera" | "screen" | "devices")
   */
  constructor({ mediaDevices = globalThis.navigator?.mediaDevices, onChange = () => {} } = {}) {
    this.mediaDevices = mediaDevices
    this.listeners = new Set([onChange])
    this.audioTrack = null
    this.videoTrack = null
    this.screenTrack = null
    this.micOn = false
    this.cameraOn = false
    this.screenOn = false
    this.deviceIds = { mic: '', camera: '' }
    this.devices = { mic: [], camera: [], speaker: [] }
    this.errors = { mic: '', camera: '', screen: '' }
    this.stopped = false
    this.onDeviceChange = () => this.refreshDevices()
    this.mediaDevices?.addEventListener?.('devicechange', this.onDeviceChange)
  }

  /** Ouve mudanças (várias telas podem observar o mesmo LocalMedia). Devolve a função que cancela. */
  subscribe(listener) {
    this.listeners.add(listener)

    return () => this.listeners.delete(listener)
  }

  onChange(change) {
    this.listeners.forEach((listener) => listener(change))
  }

  /** Tenta ligar microfone e câmera conforme pedido; erros ficam em `errors` sem interromper o resto. */
  async start({ mic = true, camera = true } = {}) {
    await Promise.all([mic ? this.setMic(true) : null, camera ? this.setCamera(true) : null])
    await this.refreshDevices()
  }

  async refreshDevices() {
    if (!this.mediaDevices?.enumerateDevices) return

    try {
      const list = await this.mediaDevices.enumerateDevices()
      const devices = { mic: [], camera: [], speaker: [] }

      list.forEach((device, index) => {
        const kind = kindOf(device)

        if (!kind || !device.deviceId) return

        devices[kind].push({ id: device.deviceId, label: device.label || `${kind} ${index + 1}` })
      })
      this.devices = devices
      this.onChange({ kind: 'devices' })
    } catch {
      // sem permissão para listar: a lista fica como estava
    }
  }

  async #acquire(kind) {
    const deviceId = this.deviceIds[kind]
    const exact = deviceId ? { deviceId: { exact: deviceId } } : {}
    const constraints =
      kind === 'mic'
        ? { audio: { ...AUDIO, ...exact }, video: false }
        : { video: { ...VIDEO, ...exact }, audio: false }
    const stream = await this.mediaDevices.getUserMedia(constraints)

    return kind === 'mic' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0]
  }

  async setMic(on) {
    if (this.stopped) return

    if (!on) {
      if (this.audioTrack) this.audioTrack.enabled = false

      this.micOn = false
      this.onChange({ kind: 'mic' })

      return
    }

    try {
      if (!this.audioTrack || this.audioTrack.readyState === 'ended') {
        this.audioTrack = await this.#acquire('mic')
      }

      this.audioTrack.enabled = true
      this.micOn = true
      this.errors.mic = ''
    } catch (error) {
      this.micOn = false
      this.errors.mic = mediaErrorMessage(error, 'mic')
    }

    this.onChange({ kind: 'mic' })
  }

  async setCamera(on) {
    if (this.stopped) return

    if (!on) {
      this.videoTrack?.stop()
      this.videoTrack = null
      this.cameraOn = false
      this.onChange({ kind: 'camera' })

      return
    }

    try {
      this.videoTrack?.stop()
      this.videoTrack = await this.#acquire('camera')
      this.cameraOn = true
      this.errors.camera = ''
    } catch (error) {
      this.videoTrack = null
      this.cameraOn = false
      this.errors.camera = mediaErrorMessage(error, 'camera')
    }

    this.onChange({ kind: 'camera' })
  }

  /** Troca de dispositivo (mantém ligado/desligado como estava). */
  async selectDevice(kind, deviceId) {
    this.deviceIds[kind] = deviceId

    if (kind === 'mic' && this.audioTrack) {
      const wasOn = this.micOn

      this.audioTrack.stop()
      this.audioTrack = null
      await this.setMic(true)

      if (!wasOn && this.audioTrack) {
        this.audioTrack.enabled = false
        this.micOn = false
        this.onChange({ kind: 'mic' })
      }
    }

    if (kind === 'camera' && this.cameraOn) await this.setCamera(true)
  }

  async startScreen() {
    if (this.stopped || this.screenOn) return

    try {
      const stream = await this.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15 } },
        audio: false,
      })
      const [track] = stream.getVideoTracks()

      track.onended = () => this.stopScreen()
      this.screenTrack = track
      this.screenOn = true
      this.errors.screen = ''
    } catch (error) {
      this.errors.screen = mediaErrorMessage(error, 'screen')
    }

    this.onChange({ kind: 'screen' })
  }

  stopScreen() {
    if (!this.screenOn && !this.screenTrack) return

    this.screenTrack?.stop()
    this.screenTrack = null
    this.screenOn = false
    this.onChange({ kind: 'screen' })
  }

  /** Solta câmera, microfone e tela (luz da câmera apaga). */
  stopAll() {
    this.stopped = true
    this.mediaDevices?.removeEventListener?.('devicechange', this.onDeviceChange)
    ;[this.audioTrack, this.videoTrack, this.screenTrack].forEach((track) => track?.stop())
    this.audioTrack = this.videoTrack = this.screenTrack = null
    this.micOn = this.cameraOn = this.screenOn = false
  }

  /** Trilhas ativas, para montar um MediaStream de pré-visualização. */
  get previewTracks() {
    return [this.videoTrack].filter(Boolean)
  }
}
