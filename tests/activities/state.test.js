import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { orderActivities, filterActivities } from '../../src/components/activities/activityState.js'
let server, useProjectActivities
before(async () => {
  server = await createServer({
    configFile: false,
    plugins: [vue()],
    resolve: { alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) } },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  useProjectActivities = (await server.ssrLoadModule('/src/composables/useProjectActivities.js'))
    .useProjectActivities
})
after(async () => await server?.close())
test('troca rápida de projeto ignora respostas atrasadas e aborta a consulta anterior', async () => {
  let resolveFirst
  const first = new Promise((resolve) => (resolveFirst = resolve)),
    signals = []
  const state = useProjectActivities({
    list: async (project, { signal }) => {
      signals.push(signal)
      return project === 1 ? first : { items: [{ id: 'file:2' }], warnings: [] }
    },
  })
  const pending = state.load(1)
  await state.load(2)
  resolveFirst({ items: [{ id: 'file:1' }], warnings: [] })
  await pending
  assert.deepEqual(
    state.items.value.map((item) => item.id),
    ['file:2'],
  )
  assert.ok(signals[0].aborted)
  state.dispose()
})
test('atualizar remove itens excluídos e retentativa recupera erro sem manter projeto antigo', async () => {
  let fail = false,
    items = [{ id: 'task:1' }]
  const state = useProjectActivities({
    list: async () => {
      if (fail) throw { response: { status: 403 } }
      return { items, warnings: [] }
    },
  })
  await state.load(3)
  items = []
  await state.load(3)
  assert.equal(state.items.value.length, 0)
  fail = true
  await state.load(3)
  assert.ok(state.error.value)
  assert.equal(state.items.value.length, 0)
  fail = false
  await state.load(3)
  assert.equal(state.error.value, '')
  state.dispose()
})
test('IDs de fontes diferentes não colidem; filtro considera a coleção completa', () => {
  const rows = [
    { id: 'task:1', target_type: 'task', created_at: '2026-10-20' },
    { id: 'file:1', target_type: 'file', created_at: '2026-10-21' },
  ]
  const sorted = orderActivities(rows)
  assert.deepEqual(
    sorted.map((item) => item.id),
    ['file:1', 'task:1'],
  )
  assert.equal(filterActivities(sorted, 'files').length, 1)
})
