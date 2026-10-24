import {
  LayoutDashboard,
  LayoutGrid,
  UsersRound,
  MessageSquare,
  FolderOpen,
  Link2,
  Video,
  History,
} from 'lucide-vue-next'

// Fonte única da navegação interna: a sidebar usa todas as seções;
// na tela do projeto, as abas continuam disponíveis apenas no mobile.
export const projectSections = [
  { key: 'geral', label: 'Visão geral', icon: LayoutDashboard },
  { key: 'kanban', label: 'Kanban', icon: LayoutGrid },
  { key: 'pastas', label: 'Arquivos', icon: FolderOpen },
  { key: 'conversa', label: 'Conversas', icon: MessageSquare },
  { key: 'reunioes', label: 'Reuniões', icon: Video },
  { key: 'membros', label: 'Participantes', icon: UsersRound },
  { key: 'links', label: 'Links de apoio', icon: Link2 },
  { key: 'atividades', label: 'Registros recentes', icon: History },
]

export const projectTabs = projectSections
  .filter((section) => section.key !== 'kanban')
  .map(({ key, label }) => ({ key, label }))

const projectRouteNames = new Set([
  'project-detail',
  'project-kanban',
  'project-members',
  'project-folders',
  'call',
])

export function projectIdFromRoute(route) {
  if (!projectRouteNames.has(route?.name)) return null
  const id = String(route.params?.id ?? '')
  return /^[1-9]\d*$/.test(id) ? id : null
}

export function projectSectionFromRoute(route) {
  if (!projectIdFromRoute(route)) return null
  if (route.name === 'project-kanban') return 'kanban'
  if (route.name === 'project-members') return 'membros'
  if (route.name === 'project-folders') return 'pastas'
  if (route.name === 'call') return 'reunioes'
  const tab = String(route.query?.aba ?? 'geral')
  return projectTabs.some((section) => section.key === tab) ? tab : 'geral'
}

export function projectSectionLocation(projectId, section) {
  const id = String(projectId)
  if (section === 'kanban') return { name: 'project-kanban', params: { id } }
  return {
    name: 'project-detail',
    params: { id },
    ...(section !== 'geral' ? { query: { aba: section } } : {}),
  }
}

export function isProjectSectionActive(route, projectId, section) {
  return projectIdFromRoute(route) === String(projectId) && projectSectionFromRoute(route) === section
}
