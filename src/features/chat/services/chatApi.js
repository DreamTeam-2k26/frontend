// Chamadas REST do chat (a instância `api` já envia o JWT e renova o token expirado).
import api from '@/api/api'

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

export const createRoom = ({ name, members, imageKey }) =>
  api
    .post('/chat/rooms/', {
      name,
      members,
      ...(imageKey ? { image_attachment_key: imageKey } : {}),
    })
    .then(unwrap)

export const updateRoom = (roomId, payload) =>
  api.patch(`/chat/rooms/${roomId}/`, payload).then(unwrap)

export const addMembers = (roomId, users) =>
  api.post(`/chat/rooms/${roomId}/members/`, { users }).then(unwrap)

export const removeMember = (roomId, userId) =>
  api.delete(`/chat/rooms/${roomId}/members/${userId}/`).then(unwrap)

export const setAdmin = (roomId, userId, isAdmin) =>
  api.post(`/chat/rooms/${roomId}/members/${userId}/admin/`, { is_admin: isAdmin }).then(unwrap)

export const leaveRoom = (roomId) => api.post(`/chat/rooms/${roomId}/leave/`)

export const markRead = (roomId) => api.post(`/chat/rooms/${roomId}/read/`)

export const listMessages = (roomId, before = null) =>
  api.get(`/chat/rooms/${roomId}/messages/`, { params: before ? { before } : {} }).then(unwrap)

/** Texto (JSON) ou arquivo (multipart). Nunca os dois na mesma mensagem. */
export function sendMessage(roomId, { body = null, file = null, replyTo = null }) {
  if (file) {
    const form = new FormData()

    form.append('file', file)
    if (replyTo) form.append('reply_to', String(replyTo))

    return api.post(`/chat/rooms/${roomId}/messages/`, form).then(unwrap)
  }

  return api.post(`/chat/rooms/${roomId}/messages/`, { body, reply_to: replyTo }).then(unwrap)
}

/** Baixa o anexo como Blob (a rota exige o JWT, então não dá para usar <a href> direto). */
export const downloadFile = (messageId) =>
  api.get(`/chat/messages/${messageId}/file/`, { responseType: 'blob' }).then(unwrap)

export const searchUsers = (search, excludeRoom = null) =>
  api
    .get('/chat/users/', {
      params: { search, ...(excludeRoom ? { exclude_room: excludeRoom } : {}) },
    })
    .then(unwrap)

/** Envia a imagem da sala para o uploader do projeto e devolve o `attachment_key`. */
export function uploadImage(file) {
  const form = new FormData()

  form.append('file', file)

  return api.post('/media/images/', form).then((response) => response.data.attachment_key)
}

export const fetchMe = () => api.get('/users/me/').then(unwrap)
