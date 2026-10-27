// Chamadas REST do chat (a instância `api` já envia o JWT e renova o token expirado).
import api from '@/api/api'
import { toMemoryFile } from '@/utils/files'

const unwrap = (response) => response.data

/** Todas as salas do usuário (a API pagina; percorre as páginas). */
export async function listRooms() {
  const rooms = []
  let page = 1
  let more = true

  while (more) {
    const data = await api.get('/chat/rooms/', { params: { page, page_size: 100 } }).then(unwrap)

    rooms.push(...data.results)
    more = page < data.total_pages
    page += 1
  }

  return rooms
}

export const getRoom = (roomId) => api.get(`/chat/rooms/${roomId}/`).then(unwrap)

export const markRead = (roomId) => api.post(`/chat/rooms/${roomId}/read/`)

export const listMessages = (roomId, before = null) =>
  api.get(`/chat/rooms/${roomId}/messages/`, { params: before ? { before } : {} }).then(unwrap)

/** Texto (JSON) ou arquivo (multipart). Nunca os dois na mesma mensagem. */
export async function sendMessage(roomId, { body = null, file = null, replyTo = null }) {
  if (file) {
    const form = new FormData()

    form.append('file', await toMemoryFile(file))
    if (replyTo) form.append('reply_to', String(replyTo))

    return api.post(`/chat/rooms/${roomId}/messages/`, form).then(unwrap)
  }

  return api.post(`/chat/rooms/${roomId}/messages/`, { body, reply_to: replyTo }).then(unwrap)
}

/** Baixa o anexo como Blob (a rota exige o JWT, então não dá para usar <a href> direto). */
export const downloadFile = (messageId) =>
  api.get(`/chat/messages/${messageId}/file/`, { responseType: 'blob' }).then(unwrap)

export const fetchMe = () => api.get('/users/me/').then(unwrap)
