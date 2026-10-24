// API falsa para testar as stores: cada função delega para globalThis.fakeApi[nome], que o teste define.
const call =
  (name) =>
  (...args) => {
    const handler = globalThis.fakeApi?.[name]
    if (!handler) return Promise.reject(new Error(`fakeApi.${name} não definido no teste`))
    return handler(...args)
  }

export const getProject = call('getProject')
export const listMemberships = call('listMemberships')
export const listAllColumns = call('listAllColumns')
export const createColumn = call('createColumn')
export const updateColumn = call('updateColumn')
export const deleteColumn = call('deleteColumn')
export const reorderColumns = call('reorderColumns')
export const listAllTasks = call('listAllTasks')
export const getTask = call('getTask')
export const createTask = call('createTask')
export const updateTask = call('updateTask')
export const deleteTask = call('deleteTask')
export const moveTask = call('moveTask')
export const attachTaskFile = call('attachTaskFile')
export const detachTaskFile = call('detachTaskFile')
export const listAllChecklistItems = call('listAllChecklistItems')
export const listAllComments = call('listAllComments')
export const createComment = call('createComment')
export const updateComment = call('updateComment')
export const deleteComment = call('deleteComment')
export const listAllSupportLinks = call('listAllSupportLinks')
export const uploadFile = call('uploadFile')
export const downloadFile = call('downloadFile')
export const getCurrentUser = call('getCurrentUser')
