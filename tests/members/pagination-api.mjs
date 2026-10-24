// Teste opt-in de volume, concorrência e impacto em tarefas contra banco isolado.
import assert from 'node:assert/strict'
import process from 'node:process'
import { readFile } from 'node:fs/promises'
import { loadProjectPages } from '../../src/api/projectPagination.js'
const fixture = JSON.parse(await readFile('/tmp/fluxo27-sessions.json', 'utf8'))
const base = process.env.FLUXO_TEST_API || 'http://127.0.0.1:8001/api/'
const owner = fixture.accounts.owner.access,
  stamp = Date.now()
async function call(path, method = 'GET', body, token = owner, expected = 200) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body && { body: JSON.stringify(body) }),
  })
  assert.equal(response.status, expected, `${method} ${path.split('?')[0]} HTTP ${response.status}`)
  return response.status === 204 ? null : response.json()
}
const project = await call('projects/', 'POST', { name: `Volume #27 ${stamp}` }, owner, 201)
let firstLink, memberSession, lastMember
for (let i = 0; i < 101; i++) {
  const link = await call(
    'invites/',
    'POST',
    { project: project.id, kind: 'link', role: 'member' },
    owner,
    201,
  )
  firstLink ||= link
  const email = `volume27-${stamp}-${i}@example.test`,
    password = `Volume-${stamp}-Q!`
  await call('register/', 'POST', { name: `Volume ${i}`, email, password }, owner, 201)
  const session = await call('token/', 'POST', { email, password })
  lastMember = await call('invites/redeem/', 'POST', { token: firstLink.token }, session.access)
  memberSession = session
}
for (const resource of ['memberships', 'invites']) {
  const pages = []
  const items = await loadProjectPages(async (page) => {
    pages.push(page)
    return call(`${resource}/?project=${project.id}&page_size=100&page=${page}`)
  })
  assert.equal(items.length, resource === 'memberships' ? 102 : 101)
  assert.deepEqual(pages, [1, 2])
}
// A mesma conta envia dois resgates concorrentes: ambos devem falhar sem duplicar.
await Promise.all([
  call('invites/redeem/', 'POST', { token: firstLink.token }, memberSession.access, 400),
  call('invites/redeem/', 'POST', { token: firstLink.token }, memberSession.access, 400),
])
const columns = await call(`columns/?project=${project.id}`)
const column =
  columns.results[0] ||
  (await call(
    'columns/',
    'POST',
    { project: project.id, name: 'Teste', category: 'todo' },
    owner,
    201,
  ))
const task = await call(
  'tasks/',
  'POST',
  {
    project: project.id,
    column: column.id,
    title: 'Responsável removido',
    assignee: lastMember.user,
  },
  owner,
  201,
)
await call(`memberships/${lastMember.id}/`, 'DELETE', undefined, owner, 204)
assert.equal((await call(`tasks/${task.id}/`)).assignee, null)
await call(`memberships/${lastMember.id}/`, 'DELETE', undefined, owner, 404)
console.log(
  'PASS backend real: 102 participantes, 101 convites, paginação completa, concorrência, exclusão e responsável da tarefa atualizado',
)
