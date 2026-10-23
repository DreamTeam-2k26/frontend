export function filterProjects(projects, search) {
  const query = search.trim().toLocaleLowerCase('pt-BR')
  return projects.filter((project) => project.name.toLocaleLowerCase('pt-BR').includes(query))
}

export function projectError(error) {
  const status = error.response?.status
  if (status === 401) return 'Sua sessão expirou. Entre novamente para continuar.'
  if (status === 403) return 'Você não tem permissão para realizar esta ação.'
  if (status === 404) return 'Este projeto não está mais disponível para você.'
  if (status === 400) {
    const messages = error.response?.data?.non_field_errors
    if (Array.isArray(messages) && messages.every((message) => typeof message === 'string'))
      return messages.join(' ')
    return 'Confira os campos e tente novamente.'
  }
  return 'Não foi possível conectar ao servidor. Tente novamente.'
}

export function projectFieldErrors(error) {
  const data = error.response?.data
  if (error.response?.status !== 400 || !data || typeof data !== 'object') return {}
  return Object.fromEntries(
    ['name', 'description']
      .filter((key) => data[key])
      .map((key) => [key, Array.isArray(data[key]) ? data[key].join(' ') : String(data[key])]),
  )
}
