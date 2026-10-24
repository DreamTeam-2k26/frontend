import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

// Links de apoio: serviço (com a instância Axios trocada por fakeHttp.js), regras, estado e lista.
const here = (path) => fileURLToPath(new URL(path, import.meta.url))

let server, service, rules, useProjectLinks, SupportLinkList, http

before(async () => {
  server = await createServer({
    configFile: false,
    plugins: [vue()],
    resolve: {
      alias: [
        { find: /^\.\/api$/, replacement: here('./fakeHttp.js') },
        { find: '@', replacement: here('../../src') },
      ],
    },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  service = await server.ssrLoadModule('/src/api/supportLinks.js')
  rules = await server.ssrLoadModule('/src/utils/supportLinks.js')
  ;({ useProjectLinks } = await server.ssrLoadModule('/src/composables/useProjectLinks.js'))
  SupportLinkList = (await server.ssrLoadModule('/src/components/links/SupportLinkList.vue'))
    .default
  ;({ http } = await server.ssrLoadModule(here('./fakeHttp.js')))
})

after(async () => await server?.close())

beforeEach(() => {
  http.calls.length = 0
  http.reply = () => ({ data: { results: [], total_pages: 1, count: 0 } })
})

const link = (id, extra = {}) => ({
  id,
  project: 1,
  task: null,
  title: `Link ${id}`,
  url: `https://exemplo.com/${id}`,
  created_by: 7,
  created_by_name: 'Clara Lima',
  created_at: '2026-10-20T12:00:00Z',
  ...extra,
})
const fail = (status, data) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status, data } })
const offline = () => Object.assign(new Error('rede'), { response: undefined })
const deferred = () => {
  let resolve
  const promise = new Promise((done) => (resolve = done))
  return { promise, resolve }
}

// Serviço

test('links gerais pedem project + task__isnull=true sem prefixo /api/ e carregam todas as páginas', async () => {
  http.reply = (_, { params }) => ({
    data: { results: [link(params.page)], total_pages: 2, count: 2 },
  })
  const signal = new AbortController().signal
  const items = await service.listProjectSupportLinks(5, { signal })

  assert.deepEqual(
    items.map((item) => item.id),
    [1, 2],
  )
  assert.deepEqual(
    http.calls.map(({ method, url, options }) => [method, url, options.params, options.signal]),
    [1, 2].map((page) => [
      'get',
      '/support-links/',
      { project: 5, task__isnull: true, page, page_size: 100 },
      signal,
    ]),
  )
})

test('links da tarefa filtram pelo projeto e pela tarefa', async () => {
  await service.listAllSupportLinks(9, { project: 5 })
  assert.deepEqual(http.calls[0].options.params, { project: 5, task: 9, page: 1, page_size: 100 })
})

test('criar, editar e excluir usam POST, PATCH e DELETE do contrato', async () => {
  http.reply = () => ({ data: {} })
  await service.createSupportLink({ project: 5, task: null, title: 'Figma', url: 'https://f.com' })
  await service.updateSupportLink(3, { task: null })
  await service.deleteSupportLink(3)

  assert.deepEqual(
    http.calls.map(({ method, url, body }) => [method, url, body]),
    [
      ['post', '/support-links/', { project: 5, task: null, title: 'Figma', url: 'https://f.com' }],
      ['patch', '/support-links/3/', { task: null }],
      ['delete', '/support-links/3/', undefined],
    ],
  )
})

// Regras do formulário

test('título é obrigatório e tem no máximo 150 caracteres', () => {
  assert.ok(rules.titleError('   '))
  assert.ok(rules.titleError('a'.repeat(151)))
  assert.equal(rules.titleError(` ${'a'.repeat(150)} `), '')
})

test('endereço exige http:// ou https:// e no máximo 2048 caracteres', () => {
  for (const bad of [
    '',
    'exemplo.com',
    'javascript:alert(1)',
    'ftp://exemplo.com',
    'data:text/html,x',
  ])
    assert.ok(rules.urlError(bad), bad)
  assert.ok(rules.urlError(`https://e.com/${'a'.repeat(2048)}`))
  assert.equal(rules.urlError('https://exemplo.com/doc'), '')
  assert.equal(rules.urlError(' http://exemplo.com '), '')
})

test('host mostra o domínio do link e tolera endereço inválido', () => {
  assert.equal(rules.linkHost('https://www.figma.com/file/1'), 'www.figma.com')
  assert.equal(rules.linkHost('qualquer'), 'qualquer')
})

// Estado dos links gerais

const client = (overrides = {}) => ({
  list: () => Promise.resolve([link(1), link(2)]),
  create: () => Promise.resolve({ data: link(3) }),
  update: (id, fields) =>
    Promise.resolve({ data: { ...link(id), ...fields, created_by_name: undefined } }),
  remove: () => Promise.resolve({}),
  ...overrides,
})

test('carrega os links gerais e trata vazio e erro', async () => {
  const state = useProjectLinks(client())
  await state.load(1)
  assert.equal(state.items.value.length, 2)
  assert.equal(state.loading.value, false)

  const empty = useProjectLinks(client({ list: () => Promise.resolve([]) }))
  await empty.load(1)
  assert.deepEqual(empty.items.value, [])
  assert.equal(empty.error.value, '')

  const broken = useProjectLinks(client({ list: () => Promise.reject(offline()) }))
  await broken.load(1)
  assert.deepEqual(broken.items.value, [])
  assert.match(broken.error.value, /conectar/)
})

test('trocar de projeto descarta resposta atrasada do anterior', async () => {
  const first = deferred()
  const second = deferred()
  const state = useProjectLinks(
    client({ list: (project) => (project === 1 ? first.promise : second.promise) }),
  )
  const a = state.load(1)
  const b = state.load(2)
  second.resolve([link(20, { project: 2 })])
  await b
  first.resolve([link(10)])
  await a
  assert.deepEqual(
    state.items.value.map((item) => item.id),
    [20],
  )
})

test('criar coloca o link no topo sem recarregar', async () => {
  const state = useProjectLinks(client())
  await state.load(1)
  await state.create({ title: 'Novo', url: 'https://n.com' })
  assert.deepEqual(
    state.items.value.map((item) => item.id),
    [3, 1, 2],
  )
})

test('criar envia task null e o projeto atual', async () => {
  let body
  const state = useProjectLinks(
    client({ create: (data) => ((body = data), Promise.resolve({ data: link(3) })) }),
  )
  await state.load(4)
  await state.create({ title: 'Novo', url: 'https://n.com' })
  assert.deepEqual(body, { project: 4, task: null, title: 'Novo', url: 'https://n.com' })
})

test('editar mantém autor exibido e vincular a uma tarefa tira o link da lista geral', async () => {
  const state = useProjectLinks(client())
  await state.load(1)
  await state.update(state.items.value[0], { title: 'Renomeado' })
  assert.equal(state.items.value[0].title, 'Renomeado')
  assert.equal(state.items.value[0].created_by_name, 'Clara Lima')

  await state.update(state.items.value[0], { task: 8 })
  assert.deepEqual(
    state.items.value.map((item) => item.id),
    [2],
  )
})

test('excluir remove da lista; falha não remove (sem falso sucesso)', async () => {
  const state = useProjectLinks(client())
  await state.load(1)
  await state.remove(state.items.value[0])
  assert.deepEqual(
    state.items.value.map((item) => item.id),
    [2],
  )

  const denied = useProjectLinks(client({ remove: () => Promise.reject(fail(403, {})) }))
  await denied.load(1)
  await assert.rejects(denied.remove(denied.items.value[0]))
  assert.equal(denied.items.value.length, 2)
})

test('erro 400 do backend é repassado para o formulário mostrar', async () => {
  const state = useProjectLinks(
    client({ create: () => Promise.reject(fail(400, { url: ['Informe um link válido.'] })) }),
  )
  await state.load(1)
  await assert.rejects(state.create({ title: 'x', url: 'https://x.com' }), (error) => {
    assert.equal(error.response.status, 400)
    return true
  })
  assert.equal(state.items.value.length, 2)
})

test('link que sumiu (404) na edição é tirado da lista', async () => {
  const state = useProjectLinks(client({ update: () => Promise.reject(fail(404, {})) }))
  await state.load(1)
  await assert.rejects(state.update(state.items.value[0], { title: 'x' }))
  assert.deepEqual(
    state.items.value.map((item) => item.id),
    [2],
  )
})

// Lista

test('lista escapa o título, abre em nova aba com segurança e mostra domínio, autor e data', async () => {
  const html = await renderToString(
    createSSRApp({
      render: () =>
        h(SupportLinkList, {
          links: [
            link(1, { title: '<img src=x onerror=alert(1)>', url: 'https://docs.exemplo.com/a' }),
          ],
          showMeta: true,
        }),
    }),
  )
  assert.match(html, /&lt;img src=x/)
  assert.doesNotMatch(html, /<img src=x/)
  assert.match(html, /target="_blank"/)
  assert.match(html, /rel="noopener noreferrer"/)
  for (const text of [
    'docs.exemplo.com',
    'Clara Lima',
    '20/10/2026',
    'Editar link',
    'Excluir link',
  ])
    assert.ok(html.includes(text), text)
})

test('criar já vinculado a uma tarefa não entra na lista geral', async () => {
  let body
  const state = useProjectLinks(
    client({ create: (data) => ((body = data), Promise.resolve({ data: link(3, { task: 8 }) })) }),
  )
  await state.load(1)
  await state.create({ title: 'Novo', url: 'https://n.com', task: 8 })
  assert.equal(body.task, 8)
  assert.deepEqual(
    state.items.value.map((item) => item.id),
    [1, 2],
  )
})
