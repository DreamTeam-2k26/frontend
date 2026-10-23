// Opt-in: use exclusivamente backend e banco de teste. Não imprime tokens/senhas.
import assert from 'node:assert/strict'
import process from 'node:process'
import { writeFile } from 'node:fs/promises'
const base = process.env.FLUXO_TEST_API || 'http://127.0.0.1:8001/api/'
const stamp = Date.now(),
  password = `Fluxo-${stamp}-Test-Q!`
async function call(path, { token, method = 'GET', body, expected = 200 } = {}) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(body && { body: JSON.stringify(body) }),
  })
  assert.equal(
    response.status,
    expected,
    `${method} ${path.split('?')[0]}: HTTP ${response.status}`,
  )
  return response.status === 204 ? null : response.json()
}
const accounts = {}
for (const name of ['owner', 'admin', 'member', 'visitor', 'other', 'decliner']) {
  const email = `team27-${stamp}-${name}@example.test`
  const user = await call('register/', {
    method: 'POST',
    body: { name: `Teste ${name}`, email, password },
    expected: 201,
  })
  accounts[name] = {
    email,
    password,
    id: user.id,
    ...(await call('token/', { method: 'POST', body: { email, password } })),
  }
}
const owner = accounts.owner.access
const project = await call('projects/', {
  token: owner,
  method: 'POST',
  body: {
    name: 'Feira de Ciências — Teste #27',
    description: 'Equipe e convites com backend real.',
  },
  expected: 201,
})
const id = project.id
const create = (body, token = owner) =>
  call('invites/', {
    token,
    method: 'POST',
    body: { project: id, role: 'member', ...body },
    expected: 201,
  })
assert.equal(
  (
    await call(
      `invites/find_user/?project=${id}&email=${encodeURIComponent(accounts.member.email)}`,
      { token: owner },
    )
  )[0].id,
  accounts.member.id,
)
const direct = await create({ kind: 'direct', invited_user: accounts.member.id })
await call('invites/', {
  token: owner,
  method: 'POST',
  body: { project: id, kind: 'direct', role: 'member', invited_user: accounts.member.id },
  expected: 400,
})
const received = await call('invites/received/', { token: accounts.member.access })
assert.ok(received.some((item) => item.id === direct.id))
assert.ok(received.every((item) => !('token' in item)))
const member = await call(`invites/${direct.id}/accept/`, {
  token: accounts.member.access,
  method: 'POST',
})
await call(`invites/${direct.id}/accept/`, {
  token: accounts.member.access,
  method: 'POST',
  expected: 400,
})
await call(`memberships/${member.id}/`, { token: owner, method: 'PATCH', body: { role: 'admin' } })
await call(`memberships/${member.id}/`, {
  token: accounts.member.access,
  method: 'PATCH',
  body: { role: 'member' },
  expected: 403,
})
await call('invites/', {
  token: accounts.member.access,
  method: 'POST',
  body: { project: id, kind: 'link', role: 'admin' },
  expected: 403,
})
console.log('PASS convite direto, busca exata, recebido, aceite, duplicidade e papéis')
const link = await create({ kind: 'link' })
const redeem = (name, token = link.token, expected = 200) =>
  call('invites/redeem/', {
    token: accounts[name].access,
    method: 'POST',
    body: { token },
    expected,
  })
const visitor = await redeem('visitor')
const other = await redeem('other')
await redeem('visitor', link.token, 400)
assert.equal((await call(`invites/${link.id}/`, { token: owner })).status, 'pending')
assert.equal(
  (await call(`invites/?project=${id}`, { token: accounts.visitor.access })).results.length,
  0,
)
await call(`memberships/${member.id}/`, {
  token: accounts.visitor.access,
  method: 'DELETE',
  expected: 403,
})
await call(`projects/${id}/`, { token: accounts.decliner.access, expected: 404 })
await call(`memberships/${other.id}/`, {
  token: accounts.member.access,
  method: 'DELETE',
  expected: 204,
})
await call(`invites/${link.id}/revoke/`, { token: owner, method: 'POST' })
await redeem('other', link.token, 400)
await redeem('other', 'invalid-token', 400)
await call('invites/', {
  token: owner,
  method: 'POST',
  body: { project: id, kind: 'link', role: 'member', expires_at: '2000-01-01T00:00:00Z' },
  expected: 400,
})
const expiring = await create({
  kind: 'link',
  expires_at: new Date(Date.now() + 2000).toISOString(),
})
await new Promise((resolve) => setTimeout(resolve, 2200))
await redeem('other', expiring.token, 400)
const declined = await create({ kind: 'direct', invited_user: accounts.decliner.id })
await call(`invites/${declined.id}/decline/`, { token: accounts.decliner.access, method: 'POST' })
assert.equal((await call('invites/received/', { token: accounts.decliner.access })).length, 0)
await call(`memberships/${member.id}/`, { token: owner, method: 'PATCH', body: { role: 'owner' } })
assert.equal((await call(`projects/${id}/`, { token: owner })).role, 'admin')
const relogin = await call('token/', {
  method: 'POST',
  body: { email: accounts.member.email, password },
})
assert.equal((await call(`projects/${id}/`, { token: relogin.access })).role, 'owner')
await call(`memberships/${member.id}/`, { token: relogin.access, method: 'DELETE', expected: 400 })
await call(`memberships/${visitor.id}/`, { token: relogin.access, method: 'DELETE', expected: 204 })
console.log(
  'PASS link reutilizável, revogação, expiração real, recusa, transferência, remoção e novo login',
)
// Projeto separado mantém o dono original para testes de interface.
const uiProject = await call('projects/', {
  token: owner,
  method: 'POST',
  body: {
    name: 'Feira de Ciências — Interface #27',
    description: 'Organização da equipe e convites reais.',
  },
  expected: 201,
})
for (const [name, role] of [
  ['admin', 'admin'],
  ['member', 'member'],
]) {
  const invitation = await call('invites/', {
    token: owner,
    method: 'POST',
    body: { project: uiProject.id, kind: 'direct', invited_user: accounts[name].id, role },
    expected: 201,
  })
  await call(`invites/${invitation.id}/accept/`, { token: accounts[name].access, method: 'POST' })
}
await call('invites/', {
  token: owner,
  method: 'POST',
  body: {
    project: uiProject.id,
    kind: 'direct',
    invited_user: accounts.visitor.id,
    role: 'member',
  },
  expected: 201,
})
await writeFile('/tmp/fluxo27-sessions.json', JSON.stringify({ accounts, project: uiProject }), {
  mode: 0o600,
})
console.log('PASS fixture privada para testes no navegador')
