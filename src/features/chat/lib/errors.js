// Converte erros da API (DRF) ou de rede em uma frase para o usuário.

const FALLBACK = 'Não foi possível concluir a ação. Tente novamente.'

function firstMessage(value) {
  if (typeof value === 'string') return value

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstMessage(item)

      if (found) return found
    }

    return ''
  }

  if (value && typeof value === 'object') {
    if (typeof value.detail === 'string') return value.detail

    for (const item of Object.values(value)) {
      const found = firstMessage(item)

      if (found) return found
    }
  }

  return ''
}

export function apiErrorMessage(error, fallback = FALLBACK) {
  const response = error?.response

  if (!response) {
    return error?.code === 'ERR_NETWORK' || error?.message === 'Network Error'
      ? 'Sem conexão com o servidor.'
      : fallback
  }

  if (response.status === 413) return 'O arquivo é grande demais.'
  if (response.status >= 500) return 'Erro no servidor. Tente novamente em instantes.'

  return firstMessage(response.data) || fallback
}
