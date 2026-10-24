import { isHttpUrl } from './kanban.js'
import { apiErrorMessage, apiFieldErrors } from './apiErrors.js'

// Mesmos limites do model SupportLink no backend.
export const TITLE_MAX = 150
export const URL_MAX = 2048

export function titleError(value) {
  const title = String(value ?? '').trim()
  if (!title) return 'Informe um título.'
  if (title.length > TITLE_MAX) return `Use no máximo ${TITLE_MAX} caracteres.`
  return ''
}

// Só http/https: barra javascript:, data: e afins (o link abre direto no navegador).
export function urlError(value) {
  const url = String(value ?? '').trim()
  if (!url) return 'Informe o endereço.'
  if (url.length > URL_MAX) return `Use no máximo ${URL_MAX} caracteres.`
  if (!isHttpUrl(url)) return 'Use um endereço começando com http:// ou https://.'
  return ''
}

export const linkRules = { title: [titleError], url: [urlError] }

export function linkHost(url) {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export function linkDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('pt-BR', { dateStyle: 'short' })
}

// Erros do formulário: 400 por campo; o resto (403, 404, rede, project) vira aviso geral.
export function linkFormErrors(cause, fallback) {
  const fields = apiFieldErrors(cause, ['title', 'url', 'task'])
  return Object.keys(fields).length ? fields : { detail: apiErrorMessage(cause, fallback) }
}
