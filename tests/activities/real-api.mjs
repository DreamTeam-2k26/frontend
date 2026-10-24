// Opt-in: backend local e banco de teste da fixture #43. Nunca executar contra produção.
import assert from 'node:assert/strict'
import process from 'node:process'
import { readFile, writeFile } from 'node:fs/promises'
import axios from 'axios'
import { createActivityClient } from '../../src/api/activityClient.js'
const fixture = JSON.parse(await readFile('/tmp/fluxo43-sessions.json', 'utf8'))
const base = process.env.FLUXO_TEST_API || 'http://127.0.0.1:8043/api/'
assert.match(
  base,
  /^http:\/\/(127\.0\.0\.1|localhost):/,
  'Usar exclusivamente backend local de teste.',
)
const account = fixture.accounts.owner
const session = await axios.post(new URL('token/', base).href, {
  email: account.email,
  password: account.password,
})
const api = axios.create({
  baseURL: base,
  headers: { Authorization: `Bearer ${session.data.access}` },
})
const requests = []
api.interceptors.request.use((config) => {
  requests.push(config.url)
  return config
})
const client = createActivityClient(api)
const { data: project } = await api.post('/projects/', {
  name: 'Registros recentes — Teste #47',
  description: 'Resumo de recursos atuais, sem API de histórico.',
})
const { data: other } = await api.post('/projects/', { name: 'Projeto vazio — Teste #47' })
const { data: folder } = await api.post('/folders/', { project: project.id, name: 'Documentos' })
const columns = await api.get('/columns/', { params: { project: project.id } })
const column =
  columns.data.results[0] ||
  (await api.post('/columns/', { project: project.id, name: 'Planejamento', category: 'todo' }))
    .data
const { data: task } = await api.post('/tasks/', {
  project: project.id,
  column: column.id,
  title: 'Preparar apresentação',
  description: 'Descrição que não deve aparecer no resumo',
})
const files = []
for (let i = 0; i < 21; i++) {
  const form = new FormData()
  form.append('project', String(project.id))
  form.append(
    'file',
    new File([`Documento de teste ${i}.\nTexto real de exemplo.\n`], `Documento-${i}.txt`, {
      type: 'text/plain',
    }),
  )
  if (i % 2) form.append('folder', String(folder.id))
  files.push((await api.post('/files/', form)).data)
}
const records = await client.list(project.id)
assert.equal(records.warnings.length, 0)
assert.equal(records.items.length, 23)
assert.equal(records.items.filter((item) => item.target_type === 'task').length, 1)
assert.equal(records.items.filter((item) => item.target_type === 'file').length, 21)
assert.ok(records.items.some((item) => item.destination?.params.folderId === folder.id))
const originalDate = records.items.find((item) => item.target_type === 'task').created_at
await api.patch(`/tasks/${task.id}/`, { title: 'Preparar apresentação revisada' })
await api.delete(`/files/${files[0].id}/`)
const refreshed = await client.list(project.id)
assert.equal(refreshed.items.length, 22)
assert.equal(refreshed.items.find((item) => item.target_type === 'task').created_at, originalDate)
assert.match(refreshed.items.find((item) => item.target_type === 'task').summary, /revisada/)
assert.equal(
  refreshed.items.some((item) => item.id === `file:${files[0].id}`),
  false,
)
assert.equal(
  requests.some((path) => path.includes('/activities/')),
  false,
)
await writeFile(
  '/tmp/fluxo47-recent-sessions.json',
  JSON.stringify({ accounts: fixture.accounts, project, other, folder, task }),
  { mode: 0o600 },
)
console.log(
  'PASS backend real: fontes atuais, arquivos em subpastas, autoria/datas reais, exclusão some na atualização, edição não cria evento e nenhuma chamada para /activities/.',
)
