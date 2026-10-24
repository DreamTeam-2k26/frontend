// Mensagens de erro da API em português, priorizando o que o servidor explicou.

const firstMessage = (value) => {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.find((item) => typeof item === 'string') ?? ''
  return ''
}

export function apiErrorMessage(error, fallback) {
  const response = error?.response
  if (!response) return 'Não foi possível conectar ao servidor. Verifique sua conexão.'

  const { status, data } = response
  const detail = firstMessage(data?.detail)
  if (detail) return detail
  if (status === 401) return 'Sua sessão expirou. Entre novamente para continuar.'
  if (status === 403) return 'Você não tem permissão para realizar esta ação.'
  if (status === 404) return 'O item não foi encontrado. Ele pode ter sido excluído.'
  if (status === 400 && data && typeof data === 'object') {
    const nonField = firstMessage(data.non_field_errors)
    if (nonField) return nonField
    const field = Object.values(data).map(firstMessage).find(Boolean)
    if (field) return field
  }
  return fallback
}

export function apiFieldErrors(error, fields) {
  const { status, data } = error?.response ?? {}
  if (status !== 400 || !data || typeof data !== 'object') return {}

  return Object.fromEntries(
    fields
      .filter((field) => firstMessage(data[field]))
      .map((field) => [field, firstMessage(data[field])]),
  )
}
