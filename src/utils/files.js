// Regras dos anexos de tarefa. O backend valida de verdade (tipo pelo conteúdo, tamanho); aqui só
// evitamos enviar o que com certeza será recusado.

// Mesmo padrão do backend (PROJECT_FILE_MAX_UPLOAD_MB).
export const MAX_UPLOAD_MB = 20

const KINDS = {
  pdf: ['pdf'],
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
  doc: ['doc', 'docx', 'odt'],
  sheet: ['xls', 'xlsx', 'ods', 'csv'],
  slides: ['ppt', 'pptx', 'odp'],
  text: ['txt', 'md'],
}

export const ALLOWED_EXTENSIONS = Object.values(KINDS).flat()

const extensionOf = (name) =>
  String(name ?? '')
    .split('.')
    .pop()
    .toLowerCase()

export function fileKind(name) {
  const extension = extensionOf(name)
  return Object.keys(KINDS).find((kind) => KINDS[kind].includes(extension)) ?? 'other'
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${units[unit]}`
}

export function uploadError(file) {
  if (!file.size) return `“${file.name}” está vazio.`
  if (!ALLOWED_EXTENSIONS.includes(extensionOf(file.name)))
    return `Tipo de arquivo não permitido: “${file.name}”.`
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024)
    return `“${file.name}” passa do limite de ${MAX_UPLOAD_MB} MB.`
  return ''
}
