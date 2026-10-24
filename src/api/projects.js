import api from './api'
import { loadProjectPages } from './projectPagination'

export async function getProject(id, { signal } = {}) {
  const { data } = await api.get(`/projects/${encodeURIComponent(id)}/`, { signal })
  return data
}

// Indicadores agregados da Visão geral (calculados pelo backend, sem baixar as tarefas).
export async function getProjectDashboard(id, { signal } = {}) {
  const { data } = await api.get(`/projects/${encodeURIComponent(id)}/dashboard/`, { signal })
  return data
}

// Próximas entregas: só as primeiras de cada categoria pendente, já ordenadas por prazo no servidor.
export async function listUpcomingTasks(id, { limit = 3, signal } = {}) {
  const page = (status) =>
    api
      .get('/tasks/', {
        params: {
          project: id,
          status,
          due_date__isnull: false,
          ordering: 'due_date',
          page_size: limit,
        },
        signal,
      })
      .then(({ data }) => (Array.isArray(data) ? data : data.results))
  return Promise.all([page('todo'), page('in_progress')])
}

export async function listProjectMembers(id, { signal } = {}) {
  return loadProjectPages(async (page) => {
    const { data } = await api.get('/memberships/', {
      params: { project: id, page, page_size: 100 },
      signal,
    })
    return data
  })
}

export async function listProjects() {
  return loadProjectPages(async (page) => {
    const { data } = await api.get('/projects/', { params: { page, page_size: 100 } })
    return data
  })
}

export async function createProject({ name, description }) {
  const { data } = await api.post('/projects/', { name, description })
  return data
}

export async function updateProject(id, { name, description }) {
  const { data } = await api.patch(`/projects/${encodeURIComponent(id)}/`, { name, description })
  return data
}

export async function deleteProject(id) {
  await api.delete(`/projects/${encodeURIComponent(id)}/`)
}

export async function leaveProject(id) {
  await api.post(`/projects/${encodeURIComponent(id)}/leave/`)
}
