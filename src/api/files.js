import api from './api'

// Envio de arquivo ao projeto (multipart). O backend valida tamanho e tipo pelo conteúdo.
export function uploadFile({ project, file }, { onProgress, signal } = {}) {
  const body = new FormData()
  body.append('project', project)
  body.append('file', file)
  return api.post('/files/', body, {
    signal,
    onUploadProgress: (event) => onProgress?.(event.total ? event.loaded / event.total : 0),
  })
}

// Download autenticado: o conteúdo vem como blob (a URL do storage nunca sai na API).
export function downloadFile(id) {
  return api.get(`/files/${id}/download/`, { responseType: 'blob' })
}
