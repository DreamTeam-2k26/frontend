import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createActivityClient } from '../../src/api/activityClient.js'
const task = {
  id: 1,
  project: 3,
  title: 'Preparar apresentação',
  created_at: '2026-10-20T10:00:00Z',
  created_by: 8,
  created_by_name: 'Clara',
  updated_at: '2026-10-24T10:00:00Z',
  description: 'SEGREDO',
}
const file = {
  id: 1,
  project: 3,
  folder: 8,
  name: 'Plano.pdf',
  uploaded_at: '2026-10-22T10:00:00Z',
  uploaded_by: 9,
  uploaded_by_name: 'Ana',
  download_url: 'SEGREDO',
}
const member = {
  id: 1,
  project: 3,
  user: 10,
  user_name: 'João',
  user_email: 'SEGREDO',
  joined_at: '2026-10-23T10:00:00Z',
  role: 'admin',
}
function api(overrides = {}) {
  return {
    get: async (path, config) => {
      if (overrides.get) return overrides.get(path, config)
      if (path === '/projects/3/') return { data: { id: 3 } }
      if (path === '/tasks/') return { data: [{ id: 1, project: 3 }] }
      if (path === '/tasks/1/') return { data: task }
      if (path === '/files/') return { data: [file] }
      if (path === '/memberships/') return { data: [member] }
      throw new Error(`Inesperado: ${path}`)
    },
  }
}
test('agrega fontes reais sem endpoint de atividades, datas inferidas ou metadados sensíveis', async () => {
  const client = createActivityClient(api()),
    result = await client.list(3)
  assert.deepEqual(
    result.items.map((item) => item.id),
    ['membership:1', 'file:1', 'task:1'],
  )
  assert.equal(result.items[2].created_at, task.created_at)
  assert.equal(result.items.length, 3) // updated_at não cria evento de edição
  assert.equal(result.items[0].summary, 'Passou a participar do projeto.')
  assert.equal(result.items[1].destination.params.folderId, 8)
  assert.equal(result.items[2].destination.query.task, '1')
  assert.equal(JSON.stringify(result).includes('SEGREDO'), false)
})
test('inclui todas as páginas de cada fonte e arquivos de subpastas sem filtro de raiz', async () => {
  const calls = []
  const client = createActivityClient(
    api({
      get: async (path, config) => {
        calls.push([path, config])
        if (path === '/projects/3/') return { data: { id: 3 } }
        if (path === '/files/')
          return { data: { results: [{ ...file, id: config.params.page }], total_pages: 2 } }
        return { data: [] }
      },
    }),
  )
  assert.equal((await client.list(3)).items.length, 2)
  assert.deepEqual(
    calls.filter(([path]) => path === '/files/').map(([, config]) => config.params),
    [1, 2].map((page) => ({ project: 3, page, page_size: 100 })),
  )
})
test('detalhes de tarefas têm concorrência limitada e omitem tarefas removidas durante leitura', async () => {
  let active = 0,
    max = 0
  const client = createActivityClient(
    api({
      get: async (path) => {
        if (path === '/projects/3/') return { data: { id: 3 } }
        if (path === '/tasks/')
          return { data: Array.from({ length: 12 }, (_, i) => ({ id: i + 1, project: 3 })) }
        if (path.startsWith('/tasks/')) {
          active++
          max = Math.max(max, active)
          await new Promise((resolve) => setTimeout(resolve, 2))
          active--
          const id = Number(path.split('/')[2])
          if (id === 12) throw { response: { status: 404 } }
          return { data: { ...task, id } }
        }
        return { data: [] }
      },
    }),
  )
  const result = await client.list(3)
  assert.equal(result.items.length, 11)
  assert.ok(max <= 4)
  assert.ok(result.warnings.length)
})
test('falha parcial não finge lista completa; acesso negado não retorna dados', async () => {
  const base = api()
  const client = createActivityClient(
    api({
      get: async (path, config) => {
        if (path === '/files/') throw { response: { status: 500 } }
        return base.get(path, config)
      },
    }),
  )
  const result = await client.list(3)
  assert.equal(result.items.length, 2)
  assert.match(result.warnings[0], /arquivos/)
  const forbidden = createActivityClient(
    api({
      get: async () => {
        throw { response: { status: 404 } }
      },
    }),
  )
  await assert.rejects(forbidden.list(3))
})
test('não mistura projetos, não cria registro sem data e não usa datas de atualização', async () => {
  const base = api()
  const client = createActivityClient(
    api({
      get: async (path, config) => {
        if (path === '/files/') return { data: [{ ...file, project: 99 }] }
        if (path === '/tasks/1/') return { data: { ...task, created_at: null } }
        return base.get(path, config)
      },
    }),
  )
  const result = await client.list(3)
  assert.deepEqual(
    result.items.map((item) => item.id),
    ['membership:1'],
  )
  assert.equal(result.warnings.length, 2)
})
test('link revalida existência e projeto antes da navegação', async () => {
  let entity = { ...file }
  const client = createActivityClient(api({ get: async () => ({ data: entity }) }))
  const record = { target_type: 'file', target_id: 1, event_type: 'file_uploaded' }
  assert.equal((await client.target(3, record)).name, 'project-folders')
  entity = { ...file, project: 99 }
  assert.equal(await client.target(3, record), null)
})
test('o autor de cada registro traz a foto de perfil (ou null) para o avatar', async () => {
  const withPictures = api({
    get: async (path) => {
      if (path === '/projects/3/') return { data: { id: 3 } }
      if (path === '/tasks/') return { data: [{ id: 1, project: 3 }] }
      if (path === '/tasks/1/')
        return { data: { ...task, created_by_profile_picture: '/media/clara.jpg' } }
      if (path === '/files/') return { data: [{ ...file, uploaded_by_profile_picture: null }] }
      if (path === '/memberships/')
        return { data: [{ ...member, user_profile_picture: '/media/joao.jpg' }] }
      throw new Error(`Inesperado: ${path}`)
    },
  })
  const { items } = await createActivityClient(withPictures).list(3)
  const pictures = Object.fromEntries(items.map((item) => [item.id, item.actor.picture]))
  assert.deepEqual(pictures, {
    'task:1': '/media/clara.jpg',
    'file:1': null,
    'membership:1': '/media/joao.jpg',
  })
})
