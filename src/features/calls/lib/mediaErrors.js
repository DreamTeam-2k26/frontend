// Mensagens em português para falhas de câmera, microfone e compartilhamento de tela.

const FRIENDLY = {
  NotAllowedError:
    'O navegador bloqueou o acesso. Libere a permissão no cadeado da barra de endereço.',
  PermissionDeniedError:
    'O navegador bloqueou o acesso. Libere a permissão no cadeado da barra de endereço.',
  NotFoundError: 'Nenhum dispositivo encontrado. Conecte um e tente de novo.',
  DevicesNotFoundError: 'Nenhum dispositivo encontrado. Conecte um e tente de novo.',
  NotReadableError: 'O dispositivo está em uso por outro programa ou aba.',
  TrackStartError: 'O dispositivo está em uso por outro programa ou aba.',
  OverconstrainedError: 'O dispositivo escolhido não está mais disponível.',
  SecurityError: 'O acesso à mídia exige conexão segura (HTTPS) ou localhost.',
  AbortError: 'Não foi possível iniciar o dispositivo.',
}

const LABEL = { mic: 'Microfone', camera: 'Câmera', screen: 'Tela' }

/** Frase para o usuário a partir do erro do getUserMedia/getDisplayMedia. `kind`: mic | camera | screen. */
export function mediaErrorMessage(error, kind) {
  const label = LABEL[kind] ?? 'Dispositivo'

  if (error?.name === 'NotAllowedError' && kind === 'screen') {
    return 'Compartilhamento de tela cancelado ou não permitido.'
  }

  return `${label}: ${FRIENDLY[error?.name] ?? 'não foi possível usar este dispositivo.'}`
}

/** O navegador oferece mídia (precisa de HTTPS/localhost e da API)? */
export function mediaSupported(nav = globalThis.navigator) {
  return !!nav?.mediaDevices?.getUserMedia && typeof globalThis.RTCPeerConnection === 'function'
}

export function screenSupported(nav = globalThis.navigator) {
  return !!nav?.mediaDevices?.getDisplayMedia
}
