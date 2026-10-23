import api from './api'

// Uploader do backend (PNG ou JPG). A resposta traz o `attachment_key` para vincular a imagem.
export function uploadImage(file) {
  const form = new FormData()

  form.append('file', file)

  return api.post('/media/images/', form)
}
