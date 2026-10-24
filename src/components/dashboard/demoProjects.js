// Dados de demonstração solicitados para visualizar a Home em desenvolvimento.
export const demoProjects = [
  {
    id: 29001,
    name: 'Feira de Ciências 2026',
    description: 'Ciências · 3º ano',
    role: 'owner',
    updated_at: '2026-10-23T12:00:00Z',
    progress: 68,
    total_memberships: 5,
  },
  {
    id: 29002,
    name: 'Semana do Meio Ambiente',
    description: 'Evento escolar · 2º ano',
    role: 'member',
    updated_at: '2026-10-22T12:00:00Z',
    progress: 40,
    total_memberships: 8,
  },
  {
    id: 29003,
    name: 'Trabalho de História',
    description: 'Apresentação em grupo',
    role: 'admin',
    updated_at: '2026-10-21T12:00:00Z',
    progress: 82,
    total_memberships: 4,
  },
].map((project) => ({
  ...project,
  memberships: [1, 2, 3].map((id) => ({ id, profile_picture: null })),
}))
