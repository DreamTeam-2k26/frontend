import { loadProjectPages } from './projectPagination.js'
import { assertProject, sameFolder, unavailableFolder } from '../components/folders/folderState.js'

// Recebe a instância compartilhada; não configura autenticação nem interceptors.
export function createFolderClient(api) {
  return {
    async list(projectId, parent = null, { signal } = {}) {
      const results = await loadProjectPages(async (page) => {
        const { data } = await api.get('/folders/', {
          params: {
            project: projectId,
            ...(parent === null ? { parent__isnull: true } : { parent }),
            page,
            page_size: 100,
          },
          signal,
        })
        return data
      })
      for (const folder of results) {
        assertProject(folder, projectId)
        if (!sameFolder(folder.parent, parent)) throw unavailableFolder()
      }
      return results
    },
    async detail(projectId, id, { signal } = {}) {
      const { data } = await api.get(`/folders/${encodeURIComponent(id)}/`, { signal })
      return assertProject(data, projectId)
    },
    async create(projectId, parent, name) {
      const { data } = await api.post('/folders/', {
        project: projectId,
        parent,
        name: name.trim(),
      })
      return data
    },
    async rename(id, name) {
      const { data } = await api.patch(`/folders/${encodeURIComponent(id)}/`, { name: name.trim() })
      return data
    },
    async move(id, parent) {
      const { data } = await api.patch(`/folders/${encodeURIComponent(id)}/`, { parent })
      return data
    },
    async remove(id) {
      await api.delete(`/folders/${encodeURIComponent(id)}/`)
    },
  }
}
