import api from './api'
import { PAGE_SIZE, loadAllPages } from './pagination'

export function listAllColumns(projectId, { signal } = {}) {
  return loadAllPages(async (page) => {
    const { data } = await api.get('/columns/', {
      params: { project: projectId, page, page_size: PAGE_SIZE },
      signal,
    })
    return data
  })
}

export function createColumn({ project, name, category }) {
  return api.post('/columns/', { project, name, category })
}

// Só o nome: a categoria interna não muda depois de criada.
export function updateColumn(id, { name }) {
  return api.patch(`/columns/${id}/`, { name })
}

export function deleteColumn(id) {
  return api.delete(`/columns/${id}/`)
}

// O backend exige todas as colunas do projeto, cada uma uma vez, na ordem final.
export function reorderColumns(projectId, columnIds) {
  return api.post('/columns/reorder/', { project: projectId, columns: columnIds })
}
