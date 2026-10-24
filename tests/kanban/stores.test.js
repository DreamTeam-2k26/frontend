import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

// Cenários de integridade das stores do Kanban (revisão do PR #44): a API real é trocada por fakeApi.js.
const here = (path) => fileURLToPath(new URL(path, import.meta.url))
const API_MODULES = [
  'tasks',
  'columns',
  'memberships',
  'projects',
  'comments',
  'checklistItems',
  'supportLinks',
  'files',
  'auth',
  'media',
]

let server
let pinia
let useKanbanStore
let useTaskDetailStore
let toasts

before(async () => {
  server = await createServer({
    configFile: false,
    resolve: {
      alias: [
        ...API_MODULES.map((name) => ({ find: `@/api/${name}`, replacement: here('./fakeApi.js') })),
        { find: 'vue3-toastify', replacement: here('./fakeToast.js') },
        { find: '@', replacement: here('../../src') },
      ],
    },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  pinia = await server.ssrLoadModule('pinia')
  ;({ useKanbanStore } = await server.ssrLoadModule('/src/stores/kanban.js'))
  ;({ useTaskDetailStore } = await server.ssrLoadModule('/src/stores/taskDetail.js'))
  ;({ toasts } = await server.ssrLoadModule(here('./fakeToast.js')))
})

after(async () => {
  await server?.close()
})

const ok = (data) => Promise.resolve({ data })
const offline = () => Promise.reject(Object.assign(new Error('rede'), { response: undefined }))
const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms))
const deferred = () => {
  let resolve
  const promise = new Promise((done) => (resolve = done))
  return { promise, resolve }
}
const task = (id, project, extra = {}) => ({
  id,
  project,
  column: project * 10,
  title: `Tarefa ${id}`,
  position: 0,
  priority: 'medium',
  assignee: null,
  ...extra,
})
const emptyLists = {
  listAllChecklistItems: () => Promise.resolve([]),
  listAllComments: () => Promise.resolve([]),
  listAllSupportLinks: () => Promise.resolve([]),
}

beforeEach(() => {
  pinia.setActivePinia(pinia.createPinia())
  toasts.length = 0
  // Projeto N: coluna N*10 e tarefa N.
  globalThis.fakeApi = {
    getProject: (id) => Promise.resolve({ id: Number(id), name: `Projeto ${id}`, role: 'owner' }),
    listAllColumns: (id) =>
      Promise.resolve([{ id: Number(id) * 10, name: 'A fazer', category: 'todo', position: 0 }]),
    listAllTasks: (id) => Promise.resolve([task(Number(id), Number(id))]),
    listMemberships: () => Promise.resolve([]),
  }
})

test('tarefa de outro projeto aberta pela URL não aparece no quadro atual', async () => {
  await useKanbanStore().load(1)
  Object.assign(globalThis.fakeApi, emptyLists, { getTask: () => ok(task(99, 2)) })

  const detail = useTaskDetailStore()
  await detail.open(99)

  assert.equal(detail.status, 'missing')
  assert.equal(detail.task, null)
})

test('editar não insere no quadro uma tarefa de outro projeto', async () => {
  const kanban = useKanbanStore()
  await kanban.load(1)
  Object.assign(globalThis.fakeApi, {
    updateTask: () => ok({ id: 99 }),
    getTask: () => ok(task(99, 2)),
  })

  await kanban.updateTaskFields(99, { priority: 'high' }).catch(() => {})

  assert.deepEqual(
    kanban.tasks.map((item) => item.id),
    [1],
  )
})

test('tarefa criada continua criada se a leitura seguinte falhar (sem repetir o POST)', async () => {
  const kanban = useKanbanStore()
  await kanban.load(1)
  let posts = 0
  Object.assign(globalThis.fakeApi, {
    createTask: (payload) => {
      posts++
      return ok({ ...payload, id: 7, position: 1 })
    },
    getTask: offline,
  })

  const created = await kanban.createTask({ title: 'Cartaz', column: 10, priority: 'high' })

  assert.equal(posts, 1)
  assert.equal(created.id, 7)
  assert.ok(kanban.tasks.some((item) => item.id === 7 && item.title === 'Cartaz'))
  assert.ok(toasts.some((item) => item.type === 'success'))
})

test('comentário publicado continua publicado se a leitura seguinte falhar', async () => {
  await useKanbanStore().load(1)
  Object.assign(globalThis.fakeApi, emptyLists, { getTask: () => ok(task(1, 1)) })
  const detail = useTaskDetailStore()
  await detail.open(1)
  let posts = 0
  Object.assign(globalThis.fakeApi, {
    createComment: ({ task: taskId, body }) => {
      posts++
      return ok({
        id: 5,
        task: taskId,
        author: 4,
        author_name: 'Ana',
        body,
        created_at: '2026-10-23T20:00:00Z',
        updated_at: '2026-10-23T20:00:00Z',
      })
    },
    listAllComments: offline,
  })

  await detail.addComment('Ficou ótimo')

  assert.equal(posts, 1)
  assert.deepEqual(
    detail.comments.map((item) => item.body),
    ['Ficou ótimo'],
  )
})

test('retry de anexo repete só o vínculo quando o upload já foi feito', async () => {
  await useKanbanStore().load(1)
  Object.assign(globalThis.fakeApi, emptyLists, { getTask: () => ok({ ...task(1, 1), files: [] }) })
  const detail = useTaskDetailStore()
  await detail.open(1)
  let uploads = 0
  let attaches = 0
  Object.assign(globalThis.fakeApi, {
    uploadFile: () => {
      uploads++
      return ok({ id: 50, name: 'roteiro.txt' })
    },
    attachTaskFile: (taskId, fileId) => {
      attaches++
      return attaches === 1 ? offline() : ok({ id: fileId, name: 'roteiro.txt', size: 10 })
    },
  })

  detail.uploadFiles([{ name: 'roteiro.txt', size: 10 }])
  await tick(10)
  assert.equal(detail.uploads[0].status, 'error')

  detail.retryUpload(detail.uploads[0].key)
  await tick(10)

  assert.equal(uploads, 1)
  assert.equal(attaches, 2)
  assert.deepEqual(
    detail.files.map((file) => file.id),
    [50],
  )
  assert.equal(detail.uploads.length, 0)
})

test('resposta tardia de criação não entra no quadro de outro projeto', async () => {
  const kanban = useKanbanStore()
  await kanban.load(1)
  const slowRead = deferred()
  Object.assign(globalThis.fakeApi, {
    createTask: (payload) => ok({ ...payload, id: 7, position: 1 }),
    getTask: () => slowRead.promise,
  })

  const creating = kanban.createTask({ title: 'Cartaz', column: 10 })
  await tick()
  await kanban.load(2)
  slowRead.resolve({ data: task(7, 1, { title: 'Cartaz' }) })
  await creating.catch(() => {})

  assert.deepEqual(
    kanban.tasks.map((item) => item.id),
    [2],
  )
})
