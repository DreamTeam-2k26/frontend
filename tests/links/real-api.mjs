// Opt-in: somente backend/banco de teste. Não imprime tokens nem senhas.
// Confere o contrato de /support-links/ usado por src/api/supportLinks.js: escopo geral/tarefa,
// CRUD, (des)vínculo, validação e isolamento entre projetos.
import assert from 'node:assert/strict'
import process from 'node:process'

const base = process.env.FLUXO_TEST_API || 'http://127.0.0.1:8043/api/'
const stamp = Date.now()
const password = `Fluxo-links-${stamp}-Q!`
const accounts = {}

async function request(path, { token, method = 'GET', body, status = 200 } = {}) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(body && { 'Content-Type': 'application/json' }),
    },
    ...(body && { body: JSON.stringify(body) }),
  })
  assert.equal(response.status, status, `${method} ${path.split('?')[0]} HTTP ${response.status}`)
  return response.status === 204 ? null : response.json()
}

const results = (data) => (Array.isArray(data) ? data : data.results)

for (const name of ['owner', 'member', 'outsider']) {
  const email = `links-${stamp}-${name}@example.test`
  await request('register/', {
    method: 'POST',
    body: { name: `Teste ${name}`, email, password },
    status: 201,
  })
  accounts[name] = {
    email,
    ...(await request('token/', { method: 'POST', body: { email, password } })),
  }
}
const owner = accounts.owner.access
const member = accounts.member.access
const outsider = accounts.outsider.access

const createProject = (token, name) =>
  request('projects/', { token, method: 'POST', body: { name }, status: 201 })
const project = await createProject(owner, 'Links de apoio')
const other = await createProject(outsider, 'Projeto alheio')

const [found] = await request(
  `invites/find_user/?project=${project.id}&email=${encodeURIComponent(accounts.member.email)}`,
  { token: owner },
)
const invite = await request('invites/', {
  token: owner,
  method: 'POST',
  body: { project: project.id, kind: 'direct', role: 'member', invited_user: found.id },
  status: 201,
})
await request(`invites/${invite.id}/accept/`, { token: member, method: 'POST' })

const columns = results(await request(`columns/?project=${project.id}`, { token: owner }))
const task = await request('tasks/', {
  token: owner,
  method: 'POST',
  body: { project: project.id, column: columns[0].id, title: 'Tarefa com links' },
  status: 201,
})
const otherColumns = results(await request(`columns/?project=${other.id}`, { token: outsider }))
const otherTask = await request('tasks/', {
  token: outsider,
  method: 'POST',
  body: { project: other.id, column: otherColumns[0].id, title: 'Tarefa alheia' },
  status: 201,
})

const general = `support-links/?project=${project.id}&task__isnull=true`
const ofTask = `support-links/?project=${project.id}&task=${task.id}`

// Membro comum cria link geral; o autor vem do token.
const link = await request('support-links/', {
  token: member,
  method: 'POST',
  body: { project: project.id, task: null, title: 'Figma', url: 'https://figma.com/x' },
  status: 201,
})
let list = results(await request(general, { token: owner }))
assert.deepEqual(
  list.map((item) => item.id),
  [link.id],
)
assert.equal(list[0].created_by_name, 'Teste member')
assert.deepEqual(results(await request(ofTask, { token: owner })), [])

// Vincula à tarefa: sai dos gerais e aparece na tarefa; desvincula de volta.
await request(`support-links/${link.id}/`, { token: owner, method: 'PATCH', body: { task: task.id } })
assert.deepEqual(results(await request(general, { token: owner })), [])
assert.equal(results(await request(ofTask, { token: owner }))[0].id, link.id)
const unlinked = await request(`support-links/${link.id}/`, {
  token: member,
  method: 'PATCH',
  body: { task: null, title: 'Protótipo' },
})
assert.equal(unlinked.task, null)
assert.equal(unlinked.title, 'Protótipo')

// Validação do backend: URL sem http(s), título longo, tarefa de outro projeto.
for (const body of [
  { url: 'javascript:alert(1)' },
  { url: 'ftp://exemplo.com' },
  { title: 'a'.repeat(151) },
  { task: otherTask.id },
]) {
  const error = await request(`support-links/${link.id}/`, {
    token: owner,
    method: 'PATCH',
    body,
    status: 400,
  })
  assert.ok(Object.keys(error).length, JSON.stringify(Object.keys(body)))
}

// Usuário de fora: não lista, não lê, não edita, não exclui, não cria no projeto alheio.
assert.deepEqual(results(await request(general, { token: outsider })), [])
await request(`support-links/${link.id}/`, { token: outsider, status: 404 })
await request(`support-links/${link.id}/`, {
  token: outsider,
  method: 'PATCH',
  body: { title: 'x' },
  status: 404,
})
await request(`support-links/${link.id}/`, { token: outsider, method: 'DELETE', status: 404 })
await request('support-links/', {
  token: outsider,
  method: 'POST',
  body: { project: project.id, task: null, title: 'x', url: 'https://x.com' },
  status: 404,
})
await request('support-links/', { method: 'GET', status: 401 })

// Exclusão por qualquer participante.
await request(`support-links/${link.id}/`, { token: member, method: 'DELETE', status: 204 })
list = results(await request(general, { token: owner }))
assert.deepEqual(list, [])

console.log('links de apoio: contrato real OK')
