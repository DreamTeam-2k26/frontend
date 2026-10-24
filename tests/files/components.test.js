import assert from 'node:assert/strict'
import { test, before, after } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
let server, List, useProjectFiles
before(async () => {
  server = await createServer({
    configFile: false,
    plugins: [vue()],
    resolve: { alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) } },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  List = (await server.ssrLoadModule('/src/components/files/FileList.vue')).default
  useProjectFiles = (await server.ssrLoadModule('/src/composables/useProjectFiles.js'))
    .useProjectFiles
})
after(async () => await server?.close())
test('lista escapa nomes e mostra metadados reais e ações acessíveis para todos os participantes', async () => {
  const html = await renderToString(
    createSSRApp({
      render: () =>
        h(List, {
          files: [
            {
              id: 1,
              name: '<script>.pdf',
              mime_type: 'application/pdf',
              size: 1024,
              uploaded_by_name: 'Clara Lima',
              uploaded_at: '2026-01-01T12:00:00Z',
            },
          ],
        }),
    }),
  )
  assert.match(html, /&lt;script&gt;.pdf/)
  assert.doesNotMatch(html, /<script>/)
  for (const text of [
    '1 KB',
    'PDF',
    'Clara Lima',
    'Baixar',
    'Renomear',
    'Mover',
    'Excluir',
    'Ações do arquivo',
  ])
    assert.ok(html.includes(text))
})
test('troca rápida de contexto ignora respostas atrasadas mesmo quando API não respeita abort', async () => {
  let firstResolve, secondResolve
  const first = new Promise((resolve) => (firstResolve = resolve)),
    second = new Promise((resolve) => (secondResolve = resolve)),
    signals = []
  const state = useProjectFiles({
    list(project, folder, { signal }) {
      signals.push(signal)
      return project === 1 ? first : second
    },
  })
  const a = state.load(1, null),
    b = state.load(2, 8)
  secondResolve([{ id: 2, name: 'Atual', uploaded_at: '2026-01-01' }])
  await b
  firstResolve([{ id: 1, name: 'Antigo' }])
  await a
  assert.deepEqual(
    state.items.value.map((x) => x.id),
    [2],
  )
  assert.ok(signals[0].aborted)
  state.dispose()
  assert.ok(signals[1].aborted)
})
test('erro não deixa registros do escopo anterior e permite tentar novamente', async () => {
  let fail = false
  const state = useProjectFiles({
    list: async () => {
      if (fail) throw { response: { status: 404 } }
      return [{ id: 1 }]
    },
  })
  await state.load(1, null)
  fail = true
  await state.load(1, 9)
  assert.equal(state.items.value.length, 0)
  assert.match(state.error.value, /não existe/)
  fail = false
  await state.load(1, null)
  assert.equal(state.error.value, '')
  assert.equal(state.items.value.length, 1)
  state.dispose()
})
