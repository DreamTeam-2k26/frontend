// API de projetos falsa para a store da Visão geral: cada função delega para globalThis.fakeProjectsApi.
const call =
  (name) =>
  (...args) => {
    const handler = globalThis.fakeProjectsApi?.[name]
    if (!handler) return Promise.reject(new Error(`fakeProjectsApi.${name} não definido no teste`))
    return handler(...args)
  }

export const getProject = call('getProject')
export const getProjectDashboard = call('getProjectDashboard')
export const listUpcomingTasks = call('listUpcomingTasks')
export const listProjectMembers = call('listProjectMembers')
export const listProjects = call('listProjects')
export const createProject = call('createProject')
export const updateProject = call('updateProject')
