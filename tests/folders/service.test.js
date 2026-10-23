import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createFolderClient } from '../../src/api/folderClient.js'
import {
  canMoveTo,
  folderNameError,
  filterFolders,
  readLocation,
  folderRoute,
  folderError,
} from '../../src/components/folders/folderState.js'

const folder = (id, parent = null, project = 1) => ({
  id,
  parent,
  project,
  name: `Pasta ${id}`,
  children_count: 0,
})
test('listagem carrega mais de 100 entradas, mantém a ordem e aplica projeto e pai a todas as páginas', async () => {
  const signal = new AbortController().signal
  const calls = []
  const api = createFolderClient({
    get: async (url, options) => {
      calls.push({ url, ...options })
      const start = options.params.page === 1 ? 1 : 101
      return {
        data: {
          results: Array.from({ length: options.params.page === 1 ? 100 : 5 }, (_, i) =>
            folder(start + i),
          ),
          total_pages: 2,
          count: 105,
        },
      }
    },
  })
  const results = await api.list('1', null, { signal })
  assert.equal(results.length, 105)
  assert.equal(results[104].id, 105)
  assert.deepEqual(
    calls.map(({ params }) => params),
    [1, 2].map((page) => ({ project: '1', parent__isnull: true, page, page_size: 100 })),
  )
  assert.ok(calls.every((call) => call.signal === signal && call.url === '/folders/'))
})

test('subpastas usam parent sem parent__isnull e rejeitam mistura de projetos ou locais', async () => {
  let item = folder(2, 8)
  const api = createFolderClient({
    get: async (_, { params }) => {
      assert.equal(params.parent, 8)
      assert.equal(params.parent__isnull, undefined)
      return { data: { results: [item], total_pages: 1 } }
    },
  })
  assert.deepEqual(await api.list(1, 8), [item])
  for (const invalid of [folder(2, 8, 9), folder(2, 10)]) {
    item = invalid
    await assert.rejects(api.list(1, 8), (error) => error.response.status === 404)
  }
})

test('serviço persiste apenas os payloads de criação, renomeação, movimento e exclusão', async () => {
  const calls = []
  const api = createFolderClient(
    Object.fromEntries(
      ['post', 'patch', 'delete'].map((method) => [
        method,
        async (...args) => {
          calls.push([method, ...args])
          return { data: folder(3) }
        },
      ]),
    ),
  )
  await api.create(1, null, '  Fotos  ')
  await api.rename(3, '  Atas  ')
  await api.move(3, 8)
  await api.move(3, null)
  await api.remove(3)
  assert.deepEqual(calls, [
    ['post', '/folders/', { project: 1, parent: null, name: 'Fotos' }],
    ['patch', '/folders/3/', { name: 'Atas' }],
    ['patch', '/folders/3/', { parent: 8 }],
    ['patch', '/folders/3/', { parent: null }],
    ['delete', '/folders/3/'],
  ])
})

test('detalhe para URL direta confirma o projeto; erro de página posterior não vira lista parcial', async () => {
  const api = createFolderClient({
    get: async () => ({
      data: {
        ...folder(4, 2, 9),
        path: [
          { id: 2, name: 'Pai' },
          { id: 4, name: 'Filha' },
        ],
      },
    }),
  })
  await assert.rejects(api.detail(1, 4), (error) => error.response.status === 404)
  const failing = createFolderClient({
    get: async (_, { params }) => {
      if (params.page === 2) throw new Error('offline')
      return { data: { results: [folder(1)], total_pages: 2 } }
    },
  })
  await assert.rejects(failing.list(1), /offline/)
})

test('seleção por URL, breadcrumb e busca restrita ao local', () => {
  assert.deepEqual(readLocation({ id: '12', folderId: '30' }), { projectId: '12', folderId: '30' })
  assert.deepEqual(readLocation({ id: 12 }), { projectId: '12', folderId: null })
  for (const params of [{ id: 'abc' }, { id: '1', folderId: '-1' }, { id: '0' }])
    assert.throws(() => readLocation(params))
  assert.deepEqual(folderRoute(12, 30), {
    name: 'project-folders',
    params: { id: 12, folderId: 30 },
  })
  assert.equal(folderRoute(12).params.folderId, undefined)
  assert.deepEqual(
    filterFolders([{ ...folder(1), name: 'Documentos' }], '  DOC  ').map((x) => x.id),
    [1],
  )
})

test('colisão ignora caixa, permite manter o nome e valida limite de 100', () => {
  const siblings = [{ ...folder(1), name: 'Documentos' }]
  assert.match(folderNameError(' DOCUMENTOS ', siblings), /Já existe/)
  assert.equal(folderNameError('Documentos', siblings, 1), '')
  assert.equal(folderNameError('A'.repeat(100)), '')
  assert.match(folderNameError('A'.repeat(101)), /100/)
})

test('destinos bloqueiam própria pasta, todos os descendentes e outro projeto', () => {
  const source = folder(1)
  assert.equal(canMoveTo(source, null), true)
  assert.equal(canMoveTo(source, { ...folder(7), path: [{ id: 7 }] }), true)
  assert.equal(canMoveTo(source, source), false)
  assert.equal(canMoveTo(source, { ...folder(9), path: [{ id: 1 }, { id: 8 }, { id: 9 }] }), false)
  assert.equal(canMoveTo(source, { ...folder(7, null, 2), path: [{ id: 7 }] }), false)
})

test('400/401/403/404/5xx e offline retornam mensagens sem fingir sucesso', () => {
  const messages = [400, 401, 403, 404, 500].map((status) => folderError({ response: { status } }))
  assert.equal(new Set(messages).size, 5)
  assert.equal(folderError(new Error('offline')), messages[4])
  assert.equal(
    folderError({
      response: { status: 400, data: { parent: ['Destino inválido.'], name: ['Nome repetido.'] } },
    }),
    'Nome repetido. Destino inválido.',
  )
})
