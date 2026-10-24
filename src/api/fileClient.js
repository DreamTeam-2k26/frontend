import { loadProjectPages } from './projectPagination.js'
import { assertProject, sameFolder, unavailableFolder } from '../components/folders/folderState.js'

// Recebe o Axios compartilhado: JWT/refresh e baseURL continuam centralizados.
export function createFileClient(api) {
  return {
    async list(project, folder = null, { signal } = {}) {
      const files = await loadProjectPages(async (page) => {
        const { data } = await api.get('/files/', {
          params: {
            project,
            ...(folder === null ? { folder__isnull: true } : { folder }),
            page,
            page_size: 100,
          },
          signal,
        })
        return data
      })
      for (const file of files) {
        assertProject(file, project)
        if (!sameFolder(file.folder, folder)) throw unavailableFolder()
      }
      return files
    },
    async upload({ project, folder = null, file, name }, { signal, onUploadProgress } = {}) {
      const body = new FormData()
      body.append('project', String(project))
      body.append('file', file)
      if (folder !== null) body.append('folder', String(folder))
      if (name?.trim()) body.append('name', name.trim())
      // O navegador determina Content-Type e boundary do multipart.
      const { data } = await api.post('/files/', body, { signal, onUploadProgress })
      return data
    },
    async rename(id, name, { signal } = {}) {
      return (
        await api.patch(`/files/${encodeURIComponent(id)}/`, { name: name.trim() }, { signal })
      ).data
    },
    async move(id, folder, { signal } = {}) {
      return (await api.patch(`/files/${encodeURIComponent(id)}/`, { folder }, { signal })).data
    },
    async remove(id, { signal } = {}) {
      await api.delete(`/files/${encodeURIComponent(id)}/`, { signal })
    },
    async download(id, { signal } = {}) {
      try {
        return await api.get(`/files/${encodeURIComponent(id)}/download/`, {
          responseType: 'blob',
          signal,
        })
      } catch (error) {
        // Erros JSON de uma requisição blob também chegam como binário no navegador.
        if (error.response?.data instanceof Blob) {
          try {
            error.response.data = JSON.parse(await error.response.data.text())
          } catch {
            /* mensagem genérica por status */
          }
        }
        throw error
      }
    },
  }
}
