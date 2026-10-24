import api from './api'
import { PAGE_SIZE, loadAllPages } from './pagination'

function listPages(params, signal) {
  return loadAllPages(async (page) => {
    const { data } = await api.get('/support-links/', {
      params: { ...params, page, page_size: PAGE_SIZE },
      signal,
    })
    return data
  })
}

// Links gerais do projeto (sem tarefa).
export function listProjectSupportLinks(projectId, { signal } = {}) {
  return listPages({ project: projectId, task__isnull: true }, signal)
}

export function listAllSupportLinks(taskId, { project, signal } = {}) {
  return listPages({ project, task: taskId }, signal)
}

// task null = link geral do projeto. created_by vem do token.
export function createSupportLink({ project, task, title, url }) {
  return api.post('/support-links/', { project, task, title, url })
}

// PATCH com { title?, url?, task? }; task null desvincula da tarefa.
export function updateSupportLink(id, fields) {
  return api.patch(`/support-links/${id}/`, fields)
}

export function deleteSupportLink(id) {
  return api.delete(`/support-links/${id}/`)
}
