import api from './api'
import { PAGE_SIZE, loadAllPages } from './pagination'

export function listAllTasks(projectId, { signal } = {}) {
  return loadAllPages(async (page) => {
    const { data } = await api.get('/tasks/', {
      params: { project: projectId, page, page_size: PAGE_SIZE },
      signal,
    })
    return data
  })
}

export function getTask(id, { signal } = {}) {
  return api.get(`/tasks/${id}/`, { signal })
}

// created_by e completed_at são definidos pelo backend; não enviar.
export function createTask({ project, column, title, description, priority, assignee, due_date }) {
  return api.post('/tasks/', { project, column, title, description, priority, assignee, due_date })
}

// PATCH só com os campos alterados (o backend valida o prazo apenas quando ele muda).
export function updateTask(id, fields) {
  return api.patch(`/tasks/${id}/`, fields)
}

export function deleteTask(id) {
  return api.delete(`/tasks/${id}/`)
}

// Drag-and-drop. Responde com as tarefas das colunas afetadas, já na ordem nova.
export function moveTask(id, { columnId, position }) {
  return api.post(`/tasks/${id}/move/`, { column_id: columnId, position })
}
