import api from './api'
import { PAGE_SIZE, loadAllPages } from './pagination'

export function listAllChecklistItems(taskId, { signal } = {}) {
  return loadAllPages(async (page) => {
    const { data } = await api.get('/checklist-items/', {
      params: { task: taskId, page, page_size: PAGE_SIZE },
      signal,
    })
    return data
  })
}

export function createChecklistItem({ task, text }) {
  return api.post('/checklist-items/', { task, text })
}

export function updateChecklistItem(id, fields) {
  return api.patch(`/checklist-items/${id}/`, fields)
}

export function deleteChecklistItem(id) {
  return api.delete(`/checklist-items/${id}/`)
}

export function reorderChecklistItems(taskId, itemIds) {
  return api.post('/checklist-items/reorder/', { task: taskId, items: itemIds })
}
