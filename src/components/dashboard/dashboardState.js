// A lista recebida aqui é completa: listProjects percorre todas as páginas da API.
export function recentProjects(projects, limit = 3) {
  return [...projects]
    .sort((a, b) => {
      const first = Date.parse(a.updated_at)
      const second = Date.parse(b.updated_at)
      return (Number.isFinite(second) ? second : 0) - (Number.isFinite(first) ? first : 0)
    })
    .slice(0, limit)
}

export function projectStats(projects) {
  return {
    total: projects.length,
    managed: projects.filter(({ role }) => role === 'owner' || role === 'admin').length,
  }
}
