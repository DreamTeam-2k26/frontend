import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSSRApp as createVueSSRApp, h } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
function createSSRApp(options) {
  return createVueSSRApp(options).use(
    createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/projects/:id', name: 'project-detail', component: { render: () => null } },
      ],
    }),
  )
}
import { renderToString } from 'vue/server-renderer'
import { projectStats, recentProjects } from '../../src/components/dashboard/dashboardState.js'
import { loadProjectPages } from '../../src/api/projectPagination.js'

let server
let Card
let Stat
before(async () => {
  server = await createServer({
    configFile: false,
    plugins: [vue()],
    resolve: { alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) } },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  Card = (await server.ssrLoadModule('/src/components/projects/ProjectCard.vue')).default
  Stat = (await server.ssrLoadModule('/src/components/dashboard/DashboardStatCard.vue')).default
})
after(async () => {
  await server?.close()
})

test('contagens e projetos recentes usam todas as páginas, sem alterar a lista original', async () => {
  const pages = [
    {
      results: [
        { id: 1, role: 'owner', updated_at: '2026-01-01' },
        { id: 2, role: 'member', updated_at: '2026-01-02' },
      ],
      total_pages: 2,
    },
    {
      results: [
        { id: 3, role: 'admin', updated_at: '2026-03-01' },
        { id: 4, role: 'member', updated_at: null },
      ],
      total_pages: 2,
    },
  ]
  const calls = []
  const projects = await loadProjectPages(async (page) => {
    calls.push(page)
    return pages[page - 1]
  })
  assert.deepEqual(calls, [1, 2])
  assert.deepEqual(projectStats(projects), { total: 4, managed: 2 })
  assert.deepEqual(
    recentProjects(projects).map((p) => p.id),
    [3, 2, 1],
  )
  assert.deepEqual(
    projects.map((p) => p.id),
    [1, 2, 3, 4],
  )
  assert.deepEqual(projectStats([]), { total: 0, managed: 0 })
  assert.deepEqual(recentProjects([]), [])
})

test('card resumido omite métricas ausentes e ações indisponíveis sem afetar Meus Projetos', async () => {
  const project = { id: 1, name: 'Projeto <real>', role: 'owner' }
  const render = (compact) =>
    renderToString(createSSRApp({ render: () => h(Card, { project, compact }) }))
  const compact = await render(true)
  assert.match(compact, /href="\/projects\/1"/)
  assert.match(compact, /Projeto &lt;real&gt;/)
  assert.doesNotMatch(compact, /Indisponível|indisponíveis|<progress|Editar/)
  const standard = await render(false)
  assert.match(standard, /Acessar projeto/)
  assert.match(standard, /Editar/)
})

test('card resumido preserva métricas reais inclusive zero sem calcular progresso', async () => {
  const html = await renderToString(
    createSSRApp({
      render: () =>
        h(Card, {
          compact: true,
          project: { id: 2, name: 'Teste', progress: 0, total_memberships: 1, memberships: [] },
        }),
    }),
  )
  assert.match(html, /<progress[^>]*value="0"/)
  assert.match(html, /1 participante/)
})

test('indicador reutilizável apresenta o valor e a descrição sem omitir zero', async () => {
  const html = await renderToString(
    createSSRApp({
      render: () =>
        h(Stat, { label: 'Sob sua gestão', value: 0, description: 'Dono ou administrador' }),
    }),
  )
  assert.match(html, /<dt[^>]*>Sob sua gestão<\/dt>/)
  assert.match(html, /<dd[^>]*>0<\/dd>/)
  assert.match(html, /Dono ou administrador/)
})
