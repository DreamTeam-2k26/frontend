// Opt-in: executa o serviço do frontend contra views reais do Django e banco persistente descartável.
// FLUXO_TEST_BACKEND=/tmp/fluxo36-backend FLUXO_TEST_DATABASE_URL=sqlite:////tmp/fluxo36-api.sqlite3
// FLUXO_TEST_PYTHON=/caminho/python FLUXO_TEST_PYTHONPATH=/caminho/__pypackages__/3.14/lib node tests/folders/real-api.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { createFolderClient } from '../../src/api/folderClient.js'
const root = process.env.FLUXO_TEST_BACKEND
const database = process.env.FLUXO_TEST_DATABASE_URL
assert.ok(
  root && database?.startsWith('sqlite:////tmp/'),
  'Use uma cópia do backend e SQLite descartável em /tmp.',
)
const bridge = fileURLToPath(new URL('./django_bridge.py', import.meta.url))
function request(payload) {
  const result = spawnSync(
    process.env.FLUXO_TEST_PYTHON || 'python3',
    [bridge, JSON.stringify(payload)],
    {
      cwd: root,
      env: {
        ...process.env,
        DEBUG: 'True',
        DATABASE_URL: database,
        PYTHONPATH: [root, process.env.FLUXO_TEST_PYTHONPATH || ''].join(':'),
      },
      encoding: 'utf8',
      timeout: 20000,
    },
  )
  assert.equal(result.status, 0, result.stderr)
  const response = JSON.parse(result.stdout.trim())
  if (response.status >= 400)
    throw Object.assign(new Error(`HTTP ${response.status}`), { response })
  return { data: response.data }
}
const users = request({ action: 'setup' }).data
const call = (actor, method, path, body) => request({ actor, method, path: `/api${path}`, body })
const adapter = (actor) =>
  Object.fromEntries(
    ['get', 'post', 'patch', 'delete'].map((method) => [
      method,
      async (path, data) => {
        if (method === 'get') {
          const query = new URLSearchParams(data?.params).toString()
          return call(actor, 'GET', path + (query ? `?${query}` : ''))
        }
        return call(actor, method.toUpperCase(), path, data)
      },
    ]),
  )
const client = createFolderClient(adapter(users.member))
const project = call(users.owner, 'POST', '/projects/', {
  name: 'Teste real de pastas #36',
  description: 'Banco descartável',
}).data
request({ action: 'memberships', project: project.id, users })
const foreignProject = call(users.owner, 'POST', '/projects/', { name: 'Outro projeto #36' }).data
const ownerApi = createFolderClient(adapter(users.owner))
const foreign = await ownerApi.create(foreignProject.id, null, 'Outro projeto')
const docs = await client.create(project.id, null, 'Documentos')
const child = await client.create(project.id, docs.id, 'Atas')
const leaf = await client.create(project.id, child.id, '2026')
const images = await client.create(project.id, null, 'Imagens')
assert.deepEqual(
  (await client.list(project.id)).map((x) => x.name),
  ['Documentos', 'Imagens'],
)
assert.equal((await client.list(project.id))[0].children_count, 1)
// Cada chamada usa um processo Django novo: detalhes/listas são recuperados do banco após navegação/F5.
assert.deepEqual(
  (await client.detail(project.id, leaf.id)).path.map((x) => x.name),
  ['Documentos', 'Atas', '2026'],
)
await client.rename(child.id, 'Reuniões')
assert.equal((await client.detail(project.id, leaf.id)).path[1].name, 'Reuniões')
await client.move(child.id, images.id)
assert.deepEqual(
  (await client.detail(project.id, leaf.id)).path.map((x) => x.name),
  ['Imagens', 'Reuniões', '2026'],
)
assert.equal((await client.list(project.id)).find((x) => x.id === docs.id).children_count, 0)
await client.move(child.id, null)
assert.deepEqual(
  (await client.detail(project.id, leaf.id)).path.map((x) => x.name),
  ['Reuniões', '2026'],
)
const fails = (promise, status) =>
  assert.rejects(promise, (error) => error.response.status === status)
await fails(client.move(child.id, child.id), 400)
await fails(client.move(child.id, leaf.id), 400)
await fails(client.move(child.id, foreign.id), 400)
await fails(client.create(project.id, null, 'DOCUMENTOS'), 400)
await fails(client.create(project.id, null, '   '), 400)
await fails(client.create(project.id, null, 'a'.repeat(101)), 400)
await fails(client.rename(images.id, 'Documentos'), 400)
await fails(ownerApi.detail(project.id, foreign.id), 404)
assert.deepEqual(
  (await ownerApi.list(foreignProject.id)).map((x) => x.id),
  [foreign.id],
)
const outside = createFolderClient(adapter(users.outsider))
await fails(outside.detail(project.id, docs.id), 404)
await fails(outside.create(project.id, null, 'Sem acesso'), 404)
await fails(createFolderClient(adapter(null)).list(project.id), 401)
// Permissões de admin e member também exercitam escrita real.
const adminApi = createFolderClient(adapter(users.admin))
await adminApi.rename(images.id, 'Imagens revisadas')
await client.remove(child.id)
await fails(client.detail(project.id, child.id), 404)
await fails(client.detail(project.id, leaf.id), 404)
await fails(client.remove(child.id), 404)
request({ action: 'bulk', project: project.id, actor: users.owner })
const all = await client.list(project.id)
assert.equal(all.length, 107)
assert.equal(new Set(all.map((x) => x.id)).size, 107)
assert.equal(all.at(-1).name, 'Volume 104')
console.log(
  'PASS: CRUD persistido, breadcrumb em 3 níveis, ciclos/colisões/projetos, owner/admin/member, 401/404 e 107 entradas em múltiplas páginas.',
)
