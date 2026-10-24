import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

// Store da Visão geral do projeto: a API real é trocada por fakeProjectsApi.js.
const here = (path) => fileURLToPath(new URL(path, import.meta.url))

let server
let pinia
let useProjectOverviewStore

before(async () => {
  server = await createServer({
    configFile: false,
    resolve: {
      alias: [
        { find: '@/api/projects', replacement: here('./fakeProjectsApi.js') },
        { find: '@', replacement: here('../../src') },
      ],
    },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  pinia = await server.ssrLoadModule('pinia')
  ;({ useProjectOverviewStore } = await server.ssrLoadModule('/src/stores/projectOverview.js'))
})

after(async () => {
  await server?.close()
})

const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms))
const offline = () => Promise.reject(Object.assign(new Error('rede'), { response: undefined }))
const deferred = () => {
  let resolve
  const promise = new Promise((done) => (resolve = done))
  return { promise, resolve }
}
const dashboard = (total, done, extra = {}) => ({
  total_tasks: total,
  done_tasks: done,
  pending_tasks: total - done,
  todo_tasks: total - done,
  in_progress_tasks: 0,
  overdue_tasks: 0,
  progress: total ? Math.round((done / total) * 100) : 0,
  ...extra,
})
const task = (id, due) => ({ id, title: `Entrega ${id}`, due_date: due, priority: 'high' })
let calls

beforeEach(() => {
  pinia.setActivePinia(pinia.createPinia())
  calls = { dashboard: 0, upcoming: 0, members: 0 }
  globalThis.fakeProjectsApi = {
    getProjectDashboard: (_id) => {
      calls.dashboard++
      return Promise.resolve(
        dashboard(12, 8, { overdue_tasks: 1, in_progress_tasks: 1, todo_tasks: 3 }),
      )
    },
    listUpcomingTasks: () => {
      calls.upcoming++
      return Promise.resolve([
        [task(9, '2026-10-26'), task(10, '2026-10-30')],
        [task(11, '2026-10-24')],
      ])
    },
    listProjectMembers: () => {
      calls.members++
      return Promise.resolve([
        { id: 1, user_name: 'Ana' },
        { id: 2, user_name: 'Bruno' },
      ])
    },
  }
})

test('carrega indicadores do dashboard, próximas entregas e participantes', async () => {
  const overview = useProjectOverviewStore()
  await overview.load(24)

  assert.equal(overview.metrics.status, 'ready')
  assert.deepEqual(overview.metrics.data, {
    total: 12,
    done: 8,
    pending: 4,
    todo: 3,
    inProgress: 1,
    overdue: 1,
    progress: 67,
  })
  assert.deepEqual(
    overview.upcoming.data.map((item) => item.id),
    [11, 9, 10],
  )
  assert.equal(overview.members.data.length, 2)
})

test('projeto sem tarefas mostra zeros, não erro', async () => {
  Object.assign(globalThis.fakeProjectsApi, {
    getProjectDashboard: () => Promise.resolve(dashboard(0, 0)),
    listUpcomingTasks: () => Promise.resolve([[], []]),
  })
  const overview = useProjectOverviewStore()
  await overview.load(24)

  assert.equal(overview.metrics.status, 'ready')
  assert.equal(overview.metrics.data.total, 0)
  assert.equal(overview.metrics.data.progress, 0)
  assert.equal(overview.upcoming.status, 'ready')
  assert.deepEqual(overview.upcoming.data, [])
})

test('falha no dashboard não esconde entregas nem participantes', async () => {
  globalThis.fakeProjectsApi.getProjectDashboard = offline
  const overview = useProjectOverviewStore()
  await overview.load(24)

  assert.equal(overview.metrics.status, 'error')
  assert.equal(overview.metrics.data, null)
  assert.ok(overview.metrics.error)
  assert.equal(overview.upcoming.status, 'ready')
  assert.equal(overview.members.status, 'ready')
})

test('falha nas entregas não esconde indicadores nem participantes', async () => {
  globalThis.fakeProjectsApi.listUpcomingTasks = offline
  const overview = useProjectOverviewStore()
  await overview.load(24)

  assert.equal(overview.upcoming.status, 'error')
  assert.equal(overview.metrics.status, 'ready')
  assert.equal(overview.members.data.length, 2)
})

test('resposta inválida do dashboard vira erro, não métrica fictícia', async () => {
  globalThis.fakeProjectsApi.getProjectDashboard = () => Promise.resolve({ total_tasks: 'muitas' })
  const overview = useProjectOverviewStore()
  await overview.load(24)

  assert.equal(overview.metrics.status, 'error')
  assert.equal(overview.metrics.data, null)
})

test('tentar de novo recarrega só a seção que falhou', async () => {
  globalThis.fakeProjectsApi.getProjectDashboard = offline
  const overview = useProjectOverviewStore()
  await overview.load(24)
  globalThis.fakeProjectsApi.getProjectDashboard = () => {
    calls.dashboard++
    return Promise.resolve(dashboard(5, 5))
  }

  await overview.retry('metrics')

  assert.equal(overview.metrics.status, 'ready')
  assert.equal(overview.metrics.data.progress, 100)
  assert.equal(calls.upcoming, 1)
  assert.equal(calls.members, 1)
})

test('troca rápida de projeto ignora a resposta atrasada do anterior', async () => {
  const slow = deferred()
  globalThis.fakeProjectsApi.getProjectDashboard = (id) =>
    id === 1 ? slow.promise : Promise.resolve(dashboard(3, 1))
  const overview = useProjectOverviewStore()

  const first = overview.load(1)
  await tick()
  await overview.load(2)
  slow.resolve(dashboard(99, 99))
  await first

  assert.equal(overview.metrics.data.total, 3)
})

test('trocar de projeto limpa os números do anterior enquanto carrega', async () => {
  const overview = useProjectOverviewStore()
  await overview.load(1)
  const slow = deferred()
  globalThis.fakeProjectsApi.getProjectDashboard = () => slow.promise

  const loading = overview.load(2)
  await tick()
  assert.equal(overview.metrics.status, 'loading')
  assert.equal(overview.metrics.data, null)
  slow.resolve(dashboard(2, 0))
  await loading
})

test('atualizar o mesmo projeto traz os números novos', async () => {
  const overview = useProjectOverviewStore()
  await overview.load(24)
  globalThis.fakeProjectsApi.getProjectDashboard = () => Promise.resolve(dashboard(13, 9))

  await overview.refresh()

  assert.equal(overview.metrics.data.total, 13)
  assert.equal(overview.metrics.data.done, 9)
})
