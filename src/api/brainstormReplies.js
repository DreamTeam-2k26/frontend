import api from './api'
import { PAGE_SIZE, loadAllPages } from './pagination'

// Todas as respostas da discussão (a thread precisa do conjunto completo para montar os níveis).
export function listAllReplies(topicId, { signal } = {}) {
  return loadAllPages(async (page) => {
    const { data } = await api.get('/brainstorm-replies/', {
      params: { topic: topicId, page, page_size: PAGE_SIZE },
      signal,
    })
    return data
  })
}

export function createReply({ topic, parent, content }) {
  return api.post('/brainstorm-replies/', { topic, parent: parent ?? null, content })
}

export function updateReply(id, { content }) {
  return api.patch(`/brainstorm-replies/${id}/`, { content })
}

export function deleteReply(id) {
  return api.delete(`/brainstorm-replies/${id}/`)
}

export function voteReply(id, value) {
  return api.post(`/brainstorm-replies/${id}/vote/`, { value })
}
