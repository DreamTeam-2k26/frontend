import api from './api'
import { loadProjectPages } from './projectPagination'

export async function getProject(id, { signal } = {}) {
  const { data } = await api.get(`/projects/${encodeURIComponent(id)}/`, { signal })
  return data
}

export async function getProjectOverview(id, { signal } = {}) {
  const load = (resource) =>
    loadProjectPages(async (page) => {
      const { data } = await api.get(`/${resource}/`, {
        params: { project: id, page, page_size: 100 },
        signal,
      })
      return data
    })
  const [tasks, columns, members] = await Promise.allSettled([
    load('tasks'),
    load('columns'),
    load('memberships'),
  ])
  return {
    tasks: tasks.status === 'fulfilled' ? tasks.value : null,
    columns: columns.status === 'fulfilled' ? columns.value : null,
    members: members.status === 'fulfilled' ? members.value : null,
  }
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
  const { data } = await api.patch(`/projects/${id}/`, { name, description })
  return data
}
