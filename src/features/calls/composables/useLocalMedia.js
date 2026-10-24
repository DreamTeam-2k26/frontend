import { onBeforeUnmount, reactive } from 'vue'
import { LocalMedia } from '../lib/localMedia'

// LocalMedia com um espelho reativo (`view`) para a interface; a mídia real fica em `media`.
export function useLocalMedia({ keepAlive = false } = {}) {
  const media = new LocalMedia()
  const view = reactive({
    micOn: false,
    cameraOn: false,
    screenOn: false,
    devices: { mic: [], camera: [], speaker: [] },
    deviceIds: { mic: '', camera: '' },
    errors: { mic: '', camera: '', screen: '' },
    previewStream: null,
  })

  function mirror() {
    view.micOn = media.micOn
    view.cameraOn = media.cameraOn
    view.screenOn = media.screenOn
    view.devices = media.devices
    view.deviceIds = { ...media.deviceIds }
    view.errors = { ...media.errors }
    view.previewStream =
      media.cameraOn && media.videoTrack ? new MediaStream([media.videoTrack]) : null
  }

  const unsubscribe = media.subscribe(mirror)

  // Ao sair da tela a câmera e o microfone são soltos, a menos que outra tela assuma o LocalMedia.
  onBeforeUnmount(() => {
    unsubscribe()

    if (!keepAlive) media.stopAll()
  })

  return { media, view }
}
