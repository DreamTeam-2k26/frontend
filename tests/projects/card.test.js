import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createMemoryHistory, createRouter } from 'vue-router'

let server
let Card
let Header
let Overview
before(async () => {
  server = await createServer({
    configFile: false,
    plugins: [vue()],
    resolve: { alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) } },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  Card = (await server.ssrLoadModule('/src/components/projects/ProjectCard.vue')).default
  Header = (await server.ssrLoadModule('/src/components/projects/ProjectHeader.vue')).default
  Overview = (await server.ssrLoadModule('/src/components/projects/ProjectOverview.vue')).default
})
after(async () => {
  await server?.close()
})

const project = {
  id: 24,
  name: 'Feira de Ciências',
  description: 'Ciências · 3º ano',
  role: 'member',
  progress: 68,
  total_memberships: 5,
  memberships: [
    { id: 1, profile_picture: 'https://cdn.example.test/photo.png' },
    { id: 2, profile_picture: null },
    { id: 3, profile_picture: '/media/photo.png' },
    { id: 4, profile_picture: null },
    { id: 5, profile_picture: null },
  ],
}
async function renderComponent(component, data, extra = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { render: () => null } },
      { path: '/projects', name: 'projects', component: { render: () => null } },
      { path: '/projects/:id', name: 'project-detail', component: { render: () => null } },
      { path: '/projects/:id/members', name: 'project-members', component: { render: () => null } },
      { path: '/projects/:id/kanban', name: 'project-kanban', component: { render: () => null } },
    ],
  })
  await router.push('/')
  const app = createSSRApp({ render: () => h(component, { project: data, ...extra }) })
  app.use(router)
  return renderToString(app)
}
const render = (overrides = {}) => renderComponent(Card, { ...project, ...overrides })

// Seções da store da Visão geral (#42): { status, data, error }.
const section = (status, data = null, error = '') => ({ status, data, error })
const idleSections = () => ({
  metrics: section('idle'),
  upcoming: section('idle'),
  members: section('idle'),
})
const people = (count) =>
  Array.from({ length: count }, (_, index) => ({ id: index, user_name: `Pessoa ${index + 1}` }))

test('card oferece link real para o detalhe e remove aviso de indisponibilidade', async () => {
  const html = await render()
  assert.match(html, /href="\/projects\/24"/)
  assert.match(html, /aria-label="Acessar projeto Feira de Ciências"/)
  assert.doesNotMatch(html, /espaço interno do projeto estará disponível em breve/)
})

test('cabeçalho preserva nome e descrição e leva ao Kanban e à criação de tarefa', async () => {
  for (const role of ['owner', 'admin', 'member']) {
    const html = await renderComponent(Header, { ...project, role })
    assert.match(html, /Nova tarefa/)
    assert.match(html, /href="\/projects\/24\/kanban\?new=1"/)
    assert.match(html, /href="\/projects\/24\/kanban"/)
    assert.match(html, /Feira de Ciências/)
    assert.match(html, /Ciências · 3º ano/)
    assert.doesNotMatch(html, /Gerenciar em Meus Projetos/)
  }
})

test('resumo usa campos reais do detalhe e não métricas da lista ou do Figma', async () => {
  const html = await renderComponent(
    Overview,
    {
      ...project,
      created_by: 17,
      created_at: '2026-10-23T15:00:00Z',
      updated_at: '2026-10-24T15:00:00Z',
    },
    idleSections(),
  )
  assert.match(html, /datetime="2026-10-23T15:00:00Z"/)
  assert.match(html, /datetime="2026-10-24T15:00:00Z"/)
  assert.match(html, /#17/)
  assert.match(html, /#24/)
  assert.doesNotMatch(html, /68%|5 membros|8 de 12|Alinhamento da equipe/)
  const missing = await renderComponent(Overview, { ...project }, idleSections())
  assert.match(missing, /Não informada/)
  assert.match(missing, /Não informado/)
})

test('visão geral mostra indicadores do dashboard, entregas e participantes', async () => {
  const html = await renderComponent(Overview, project, {
    metrics: section('ready', {
      total: 12,
      done: 8,
      pending: 4,
      todo: 3,
      inProgress: 1,
      overdue: 1,
      progress: 67,
    }),
    upcoming: section('ready', [
      { id: 9, title: 'Entrega 9', due_date: '2026-10-24', priority: 'high', is_overdue: true },
    ]),
    members: section('ready', people(5)),
  })
  assert.match(html, /8 de 12 tarefas concluídas/)
  assert.match(html, /67%/)
  assert.match(html, /4 pendentes/)
  assert.match(html, /A fazer/)
  assert.match(html, /Em andamento/)
  assert.match(html, /5 membros/)
  assert.match(html, /Entrega 9/)
  assert.match(html, /\(atrasada\)/)
  assert.doesNotMatch(html, /Entrega 1</)
  assert.match(html, /Próxima reunião/)
})

test('falha nos indicadores mostra erro com nova tentativa e mantém participantes', async () => {
  const html = await renderComponent(Overview, project, {
    metrics: section('error', null, 'Não foi possível carregar os indicadores.'),
    upcoming: section('ready', []),
    members: section('ready', people(2)),
  })
  assert.match(html, /Não foi possível carregar os indicadores\./)
  assert.match(html, /Tentar novamente/)
  assert.doesNotMatch(html, /\d+% do projeto/)
  assert.match(html, /2 membros/)
  assert.match(html, /Próxima reunião/)
})

test('projeto sem tarefas mostra zeros reais', async () => {
  const html = await renderComponent(Overview, project, {
    metrics: section('ready', {
      total: 0,
      done: 0,
      pending: 0,
      todo: 0,
      inProgress: 0,
      overdue: 0,
      progress: 0,
    }),
    upcoming: section('ready', []),
    members: section('ready', people(1)),
  })
  assert.match(html, /Nenhuma tarefa criada ainda/)
  assert.match(html, /0 de 0 tarefas concluídas/)
  assert.match(html, /Nenhuma tarefa atrasada/)
  assert.match(html, /Nenhuma entrega pendente/)
})

test('card renderiza progresso e total reais, três avatares e quantidade excedente', async () => {
  const html = await render()
  assert.match(html, /<progress[^>]*value="68"[^>]*max="100"/)
  assert.match(html, /68%/)
  assert.match(html, /5 participantes/)
  assert.match(html, /Mais 2 participantes/)
  assert.equal((html.match(/class="member-avatar"/g) ?? []).length, 3)
  assert.match(html, /src="https:\/\/cdn.example.test\/photo.png"/)
  assert.match(html, /src="[^"]*\/media\/photo.png"/)
  assert.doesNotMatch(html, /Editar Feira/)
})

test('zero e cem por cento são valores válidos, não estados de ausência', async () => {
  for (const progress of [0, 100]) {
    const html = await render({
      progress,
      total_memberships: 1,
      memberships: [{ id: 1, profile_picture: null }],
    })
    assert.match(html, new RegExp(`<progress[^>]*value="${progress}"`))
    assert.match(html, /1 participante</)
    assert.doesNotMatch(html, /Mais \d+ participantes|<img/)
    assert.match(html, /aria-label="Participante 1"/)
  }
})

test('resposta básica de criação não inventa métricas antes da revalidação', async () => {
  const html = await render({
    progress: undefined,
    total_memberships: undefined,
    memberships: undefined,
  })
  assert.doesNotMatch(html, /<progress|class="member-avatar"/)
  assert.match(html, /Participantes indisponíveis/)
  assert.match(html, /Indisponível/)
})

test('owner e admin mantêm edição com o novo rodapé e conteúdo escapado', async () => {
  for (const role of ['owner', 'admin']) {
    const html = await render({ role, name: '<script>teste</script>' })
    assert.match(html, /Editar &lt;script&gt;teste&lt;\/script&gt;/)
    assert.doesNotMatch(html, /<script>/)
  }
})
