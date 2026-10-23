import api from './api'
import { PAGE_SIZE, loadAllPages } from './pagination'

export function listAllSupportLinks(taskId, { signal } = {}) {
  return loadAllPages(async (page) => {
    const { data } = await api.get('/support-links/', {
      params: { task: taskId, page, page_size: PAGE_SIZE },
      signal,
    })
    return data
  })
}

export function createSupportLink({ project, task, title, url }) {
  return api.post('/support-links/', { project, task, title, url })
}

export function deleteSupportLink(id) {
  return api.delete(`/support-links/${id}/`)
}
