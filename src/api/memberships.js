import api from './api'
import { PAGE_SIZE, loadAllPages } from './pagination'

export function listAllMembers(projectId, { signal } = {}) {
  return loadAllPages(async (page) => {
    const { data } = await api.get('/memberships/', {
      params: { project: projectId, page, page_size: PAGE_SIZE },
      signal,
    })
    return data
  })
}
