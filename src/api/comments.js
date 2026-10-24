import api from './api'
import { PAGE_SIZE, loadAllPages } from './pagination'

export function listAllComments(taskId, { signal } = {}) {
  return loadAllPages(async (page) => {
    const { data } = await api.get('/comments/', {
      params: { task: taskId, page, page_size: PAGE_SIZE },
      signal,
    })
    return data
  })
}

// O autor vem do token no backend; nunca enviar author.
export function createComment({ task, body }) {
  return api.post('/comments/', { task, body })
}

export function updateComment(id, { body }) {
  return api.patch(`/comments/${id}/`, { body })
}

export function deleteComment(id) {
  return api.delete(`/comments/${id}/`)
}
