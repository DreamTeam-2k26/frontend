export function folderRoute(projectId, folderId = null) {
  return { name: 'project-folders', params: { id: projectId, folderId: folderId ?? undefined } }
}

export function readLocation(params) {
  const id = String(params.id ?? '')
  const folderId =
    params.folderId == null || params.folderId === '' ? null : String(params.folderId)
  if (!/^[1-9]\d*$/.test(id) || (folderId !== null && !/^[1-9]\d*$/.test(folderId))) {
    throw unavailableFolder()
  }
  return { projectId: id, folderId }
}

export function unavailableFolder() {
  return Object.assign(new Error('Pasta ou projeto indisponível.'), { response: { status: 404 } })
}

export function assertProject(folder, projectId) {
  if (String(folder.project) !== String(projectId)) throw unavailableFolder()
  return folder
}

export function filterFolders(folders, query) {
  const name = query.trim().toLocaleLowerCase('pt-BR')
  return folders.filter((folder) => folder.name.toLocaleLowerCase('pt-BR').includes(name))
}

export function folderNameError(name, siblings = [], excludeId = null) {
  const value = name.trim()
  if (value.length > 100) return 'Use no máximo 100 caracteres.'
  if (
    siblings.some(
      (folder) =>
        String(folder.id) !== String(excludeId) &&
        folder.name.toLocaleLowerCase('pt-BR') === value.toLocaleLowerCase('pt-BR'),
    )
  ) {
    return 'Já existe uma pasta com esse nome neste local.'
  }
  return ''
}

export function canMoveTo(source, destination) {
  return (
    destination === null ||
    (String(source.project) === String(destination.project) &&
      !destination.path?.some((ancestor) => String(ancestor.id) === String(source.id)) &&
      String(source.id) !== String(destination.id))
  )
}

export function sameFolder(a, b) {
  return (a == null && b == null) || (a != null && b != null && String(a) === String(b))
}

export function folderError(error) {
  const status = error.response?.status
  if (status === 401) return 'Sua sessão expirou. Entre novamente para continuar.'
  if (status === 403) return 'Você não tem permissão para realizar esta ação.'
  if (status === 404)
    return 'A pasta ou o projeto não existe mais ou não está disponível para sua conta.'
  if (status === 400) {
    const data = error.response.data
    const messages = ['name', 'parent', 'project', 'non_field_errors', 'detail']
      .flatMap((key) => data?.[key] ?? [])
      .filter((message) => typeof message === 'string')
    return messages.join(' ') || 'Confira os dados e o destino da pasta e tente novamente.'
  }
  return 'Não foi possível concluir a solicitação. Verifique sua conexão e tente novamente.'
}
