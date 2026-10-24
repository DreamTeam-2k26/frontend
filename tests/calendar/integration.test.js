import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRouter, createMemoryHistory } from 'vue-router'
let server, transport, useProjectCalendar, CalendarMonth, BaseDatePicker
before(async () => {
  server = await createServer({
    configFile: false,
    plugins: [
      vue(),
      {
        name: 'calendar-api',
        enforce: 'pre',
        resolveId(id, importer) {
          if (id === './api' && importer?.includes('/src/api/'))
            return fileURLToPath(new URL('./fakeTransport.js', import.meta.url))
        },
      },
    ],
    resolve: { alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) } },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  ;({ transport } = await server.ssrLoadModule('/tests/calendar/fakeTransport.js'))
  ;({ useProjectCalendar } = await server.ssrLoadModule('/src/composables/useProjectCalendar.js'))
  CalendarMonth = (await server.ssrLoadModule('/src/components/calendar/CalendarMonth.vue')).default
  BaseDatePicker = (await server.ssrLoadModule('/src/components/ui/BaseDatePicker.vue')).default
})
after(async () => {
  await server?.close()
})
const item = (id, project = 1) => ({
  id,
  project,
  title: `Prazo ${id}`,
  due_date: '2026-10-24',
  column: 1,
  priority: 'high',
  assignee: null,
})
function handler(url, options) {
  if (url.startsWith('/projects/'))
    return Promise.resolve({ data: { id: Number(url.split('/')[2]), name: 'Projeto' } })
  const project = Number(options.params.project)
  return Promise.resolve({
    data: { results: url === '/tasks/' ? [item(1, project)] : [], total_pages: 1 },
  })
}
test('serviços reais paginam tarefas/colunas/membros e só usam GET no projeto solicitado', async () => {
  const calls = []
  transport.handler = async (url, options) => {
    calls.push([url, options])
    if (url === '/tasks/') {
      const page = options.params.page
      return {
        data: {
          results: Array.from({ length: page === 1 ? 100 : 7 }, (_, i) =>
            item((page - 1) * 100 + i),
          ),
          total_pages: 2,
        },
      }
    }
    return handler(url, options)
  }
  const calendar = useProjectCalendar()
  await calendar.load('1')
  assert.equal(calendar.state.status, 'ready')
  assert.equal(calendar.state.tasks.length, 107)
  assert.deepEqual(
    calls.filter(([url]) => url === '/tasks/').map(([, opts]) => opts.params),
    [1, 2].map((page) => ({ project: '1', page, page_size: 100 })),
  )
  assert.ok(calls.every(([, opts]) => opts.signal instanceof AbortSignal))
  calendar.reset()
})
test('troca de projeto descarta resposta antiga mesmo se transporte ignorar abort', async () => {
  let finish
  transport.handler = (url, options) =>
    url === '/tasks/' && options.params.project === '1'
      ? new Promise((resolve) => {
          finish = resolve
        })
      : handler(url, options)
  const calendar = useProjectCalendar()
  const first = calendar.load('1')
  await new Promise((resolve) => setTimeout(resolve, 0))
  await calendar.load('2')
  assert.equal(calendar.state.project.id, 2)
  finish({ data: [item(9, 1)] })
  await first
  assert.equal(calendar.state.project.id, 2)
  assert.ok(calendar.state.tasks.every((t) => t.project === 2))
  calendar.reset()
})
test('falha de página não mostra lista parcial; retry e isolamento de projeto', async () => {
  const calendar = useProjectCalendar()
  transport.handler = async (url, options) => {
    if (url === '/tasks/') {
      if (options.params.page === 2) throw new Error('offline')
      return { data: { results: [item(1)], total_pages: 2 } }
    }
    return handler(url, options)
  }
  await calendar.load('1')
  assert.equal(calendar.state.status, 'error')
  assert.deepEqual([...calendar.state.tasks], [])
  transport.handler = handler
  await calendar.load('1')
  assert.equal(calendar.state.status, 'ready')
  transport.handler = (url, options) =>
    url === '/tasks/' ? Promise.resolve({ data: [item(1, 99)] }) : handler(url, options)
  await calendar.load('1')
  assert.equal(calendar.state.status, 'error')
  assert.equal(calendar.state.errorStatus, 404)
  assert.equal(calendar.state.tasks.length, 0)
  calendar.reset()
})
test('mês renderiza links, status, prioridade, contagem e agenda completa do dia', async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/projects/:id/kanban', name: 'project-kanban', component: { render: () => null } },
    ],
  })
  const app = createSSRApp({
    render: () =>
      h(CalendarMonth, {
        month: '2026-10',
        selected: '2026-10-24',
        today: '2026-10-25',
        projectId: 1,
        tasks: Array.from({ length: 5 }, (_, i) => item(i + 1)),
        columns: [{ id: 1, name: 'A fazer', category: 'todo' }],
      }),
  }).use(router)
  const html = await renderToString(app)
  assert.match(html, /\/projects\/1\/kanban\?task=1/)
  assert.match(html, /Prioridade Alta/)
  assert.match(html, /Atrasada/)
  assert.match(html, /\+2 tarefas/)
  assert.match(html, /5 tarefas/)
  assert.match(html, /Prazo 5/)
  assert.match(html, /data-date="2026-10-24" tabindex="0"/)
})

test('projeto inválido não faz requisição; 401/403/404 não exibem tarefas anteriores', async () => {
  const calendar = useProjectCalendar()
  let calls = 0
  transport.handler = (...args) => {
    calls++
    return handler(...args)
  }
  await calendar.load('invalido')
  assert.equal(calls, 0)
  assert.equal(calendar.state.errorStatus, 404)
  for (const status of [401, 403, 404]) {
    transport.handler = handler
    await calendar.load('1')
    assert.equal(calendar.state.tasks.length, 1)
    transport.handler = () => Promise.reject({ response: { status } })
    const request = calendar.load('2')
    assert.equal(calendar.state.status, 'loading')
    assert.equal(calendar.state.tasks.length, 0)
    await request
    assert.equal(calendar.state.errorStatus, status)
    assert.equal(calendar.state.project, null)
  }
  calendar.reset()
})

test('seletor Fluxo exibe data brasileira, label, erro e estado bloqueado sem picker nativo', async () => {
  const html = await renderToString(
    createSSRApp({
      render: () =>
        h(BaseDatePicker, {
          modelValue: '2026-10-24',
          label: 'Prazo final',
          name: 'due_date',
          error: 'Confira o prazo',
          disabled: true,
        }),
    }),
  )
  assert.match(html, /24 \/ 10 \/ 2026/)
  assert.match(html, /Prazo final/)
  assert.match(html, /aria-haspopup="dialog"/)
  assert.match(html, /aria-invalid="true"/)
  assert.match(html, /disabled/)
  assert.match(html, /Confira o prazo/)
  assert.doesNotMatch(html, /type="date"/)
})
