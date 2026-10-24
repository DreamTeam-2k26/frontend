export const allowedExtensions = [
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'txt',
  'md',
  'csv',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'odt',
  'ods',
  'odp',
]
export const acceptFiles = allowedExtensions.map((value) => `.${value}`).join(',')
export const extension = (name) => /\.([^.]+)$/.exec(name || '')?.[1].toLowerCase() || ''
export function fileNameError(name) {
  if (!name.trim()) return 'Informe o nome do arquivo.'
  if (name.trim().length > 255) return 'Use no máximo 255 caracteres.'
  if (
    /[/\\]/.test(name) ||
    [...name].some((char) => char.charCodeAt(0) < 32) ||
    ['.', '..'].includes(name.trim())
  )
    return 'Use um nome sem barras ou caracteres de controle.'
  return ''
}
export function validateUpload(file, limitMB) {
  if (!file) return 'Selecione um arquivo para enviar.'
  if (!file.size) return 'O arquivo está vazio.'
  if (file.size > limitMB * 1024 * 1024)
    return `O arquivo excede o limite de ${limitMB} MB configurado nesta interface.`
  if (!allowedExtensions.includes(extension(file.name)))
    return 'Formato não permitido. Selecione um dos formatos indicados.'
  return ''
}
export function formatSize(size) {
  if (!Number.isFinite(Number(size)) || size == null || Number(size) < 0)
    return 'Tamanho não informado'
  const value = Number(size)
  if (value < 1024) return `${value} B`
  const unit = value < 1024 ** 2 ? 1 : value < 1024 ** 3 ? 2 : 3
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value / 1024 ** unit)} ${['B', 'KB', 'MB', 'GB'][unit]}`
}
export const uploadDate = (value) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : 'Data não informada'
export const recentFiles = (files) =>
  [...files].sort(
    (a, b) =>
      (Date.parse(b.uploaded_at) || 0) - (Date.parse(a.uploaded_at) || 0) ||
      Number(b.id) - Number(a.id),
  )
export function fileError(error) {
  const status = error?.response?.status
  if (status === 400) {
    const data = error.response.data
    const messages = ['file', 'name', 'folder', 'project', 'detail', 'non_field_errors']
      .flatMap((key) => data?.[key] ?? [])
      .filter((value) => typeof value === 'string')
    return messages.join(' ') || 'Confira o arquivo, o nome e a pasta de destino.'
  }
  if (status === 401) return 'Sua sessão expirou. Entre novamente para continuar.'
  if (status === 403) return 'Você não tem permissão para operar arquivos neste projeto.'
  if (status === 404)
    return 'O arquivo, a pasta ou o projeto não existe mais ou não está disponível para sua conta.'
  if (status === 413) return 'O arquivo excedeu o limite de envio do servidor.'
  if (status >= 500) return 'O servidor não conseguiu concluir a operação. Tente novamente.'
  return 'Não foi possível concluir a operação. Verifique sua conexão e tente novamente.'
}
export function downloadName(headers, fallback) {
  const disposition = headers?.['content-disposition'] || ''
  let name = /filename="([^"]+)"/i.exec(disposition)?.[1]
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1]
  if (encoded) {
    try {
      name = decodeURIComponent(encoded)
    } catch {
      /* usa nome dos metadados */
    }
  }
  return [...(name || fallback || 'arquivo')]
    .map((char) => (char === '/' || char === '\\' || char.charCodeAt(0) < 32 ? '_' : char))
    .join('')
}
// Downloads são anexos, nunca previews/HTML. A URL temporária é revogada após iniciar o download.
export function saveDownload(
  blob,
  name,
  environment = { document, URL, setTimeout: (callback, delay) => setTimeout(callback, delay) },
) {
  const url = environment.URL.createObjectURL(blob)
  const anchor = environment.document.createElement('a')
  try {
    anchor.href = url
    anchor.download = name
    anchor.rel = 'noopener'
    environment.document.body.append(anchor)
    anchor.click()
  } finally {
    anchor.remove()
    environment.setTimeout(() => environment.URL.revokeObjectURL(url), 1000)
  }
}
