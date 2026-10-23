import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createMemoryHistory, createRouter } from 'vue-router'
let server, Breadcrumb, List, Form, useFolderExplorer
before(async () => {
  server = await createServer({
    configFile: false,
    plugins: [vue()],
    resolve: { alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) } },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  Breadcrumb = (await server.ssrLoadModule('/src/components/folders/FolderBreadcrumb.vue')).default
  List = (await server.ssrLoadModule('/src/components/folders/FolderList.vue')).default
  Form = (await server.ssrLoadModule('/src/components/folders/FolderForm.vue')).default
  useFolderExplorer = (await server.ssrLoadModule('/src/composables/useFolderExplorer.js'))
    .useFolderExplorer
})
after(async () => {
  await server?.close()
})
async function render(component, props) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/projects/:id/folders/:folderId?', name: 'project-folders', component: {} }],
  })
  await router.push('/projects/12/folders/30')
  return renderToString(createSSRApp({ render: () => h(component, props) }).use(router))
}

test('breadcrumb restaura níveis da API, links mantêm o projeto e último nível é atual', async () => {
  const html = await render(Breadcrumb, {
    projectId: 12,
    path: [
      { id: 20, name: 'Documentos' },
      { id: 25, name: 'Atas' },
      { id: 30, name: '2026' },
    ],
  })
  assert.match(html, /href="\/projects\/12\/folders"/)
  assert.match(html, /href="\/projects\/12\/folders\/20"/)
  assert.match(html, /href="\/projects\/12\/folders\/25"/)
  assert.match(html, /aria-current="page"[^>]*>2026/)
})

test('lista mostra subpastas diretas e ações acessíveis para qualquer participante', async () => {
  const html = await render(List, {
    projectId: 12,
    folders: [{ id: 30, project: 12, name: '<Atas>', children_count: 2 }],
  })
  assert.match(html, /2 subpastas diretas/)
  assert.match(html, /href="\/projects\/12\/folders\/30"/)
  for (const action of ['Renomear', 'Mover', 'Excluir'])
    assert.match(html, new RegExp(`aria-label="${action} pasta &lt;Atas&gt;"`))
  assert.doesNotMatch(html, /arquivos|<Atas>/)
})

test('formulário reutilizado mantém nome existente, label e bloqueio durante envio', async () => {
  const html = await render(Form, { folder: { id: 30, name: 'Atas' }, siblings: [], busy: true })
  assert.match(html, /Renomear pasta/)
  assert.match(html, /Nome da pasta/)
  assert.match(html, /value="Atas"/)
  assert.match(html, /disabled/)
})

function deferred() {
  let resolve
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}
test('respostas antigas não aparecem depois de mudar projeto/pasta, mesmo ignorando abort', async () => {
  const first = deferred(),
    second = deferred(),
    signals = []
  const explorer = useFolderExplorer({
    getProject: async (id, { signal }) => {
      signals.push(signal)
      return { id }
    },
    folders: {
      detail: async (project, id) => ({ id, project, path: [{ id, name: 'Atual' }] }),
      list: (id) => (id === '1' ? first.promise : second.promise),
    },
  })
  const old = explorer.load({ id: '1', folderId: '4' })
  await Promise.resolve()
  await Promise.resolve()
  const latest = explorer.load({ id: '2', folderId: '5' })
  await Promise.resolve()
  await Promise.resolve()
  assert.equal(signals[0].aborted, true)
  assert.deepEqual(explorer.items.value, [])
  second.resolve([{ id: 50, project: 2 }])
  await latest
  first.resolve([{ id: 40, project: 1 }])
  await old
  assert.equal(explorer.project.value.id, '2')
  assert.equal(explorer.currentFolder.value.id, '5')
  assert.equal(explorer.items.value[0].id, 50)
  explorer.dispose()
})

test('URL inválida não chama API e não exibe dados do local anterior', async () => {
  let calls = 0
  const explorer = useFolderExplorer({
    getProject: async () => {
      calls++
      return { id: 1 }
    },
    folders: {},
  })
  await explorer.load({ id: 'abc' })
  assert.equal(calls, 0)
  assert.equal(explorer.status.value, 404)
  assert.equal(explorer.project.value, null)
  assert.deepEqual(explorer.items.value, [])
  explorer.dispose()
})
