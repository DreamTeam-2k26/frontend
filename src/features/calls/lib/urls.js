import { apiOrigin, configuredApiUrl } from '../../chat/lib/urls.js'

/** URL do WebSocket de avisos (`/ws/calls/`) ou da sala de uma chamada (`/ws/calls/<id>/`). */
export function callsSocketUrl(token, callId = null, apiUrl = configuredApiUrl(), pageOrigin) {
  const base = apiOrigin(apiUrl, pageOrigin).replace(/^http/i, 'ws')
  const path = callId ? `/ws/calls/${callId}/` : '/ws/calls/'

  return `${base}${path}?token=${encodeURIComponent(token)}`
}
