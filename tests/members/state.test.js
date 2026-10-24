import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  canRemove,
  canChangeRole,
  filterMembers,
  inviteStatus,
  usableLink,
  inviteUrl,
  teamError,
} from '../../src/components/members/teamState.js'
import { authDestination, authQuery } from '../../src/utils/authRedirect.js'
import { loadProjectPages } from '../../src/api/projectPagination.js'
test('matriz de permissões protege dono e restringe admin', () => {
  for (const actor of ['owner', 'admin', 'member']) {
    assert.equal(canRemove(actor, 'owner'), false)
    assert.equal(canChangeRole(actor, 'owner'), false)
    assert.equal(canRemove(actor, 'admin'), actor === 'owner')
    assert.equal(canRemove(actor, 'member'), actor !== 'member')
    assert.equal(canChangeRole(actor, 'member'), actor === 'owner')
  }
})
test('busca local normaliza nome e e-mail sem modificar lista', () => {
  const members = [{ user_name: 'Clara Lima', user_email: 'clara@example.test' }]
  assert.equal(filterMembers(members, ' LIMA ').length, 1)
  assert.equal(filterMembers(members, 'CLARA@').length, 1)
  assert.equal(filterMembers(members, 'outro').length, 0)
  assert.equal(members.length, 1)
})
test('expiração calculada não altera estados finais; link é reutilizável', () => {
  const expired = {
    kind: 'link',
    token: 'test',
    status: 'pending',
    expires_at: '2000-01-01T00:00:00Z',
  }
  assert.equal(inviteStatus(expired), 'expired')
  assert.equal(usableLink(expired), false)
  for (const status of ['accepted', 'declined', 'revoked'])
    assert.equal(inviteStatus({ ...expired, status }), status)
  assert.equal(usableLink({ ...expired, expires_at: null }), true)
  assert.equal(usableLink({ ...expired, kind: 'direct', expires_at: null }), false)
  assert.equal(expired.status, 'pending')
  assert.equal(
    inviteUrl('test_token', 'https://fluxo.example', '/app/'),
    'https://fluxo.example/app/invite/test_token',
  )
})
test('retorno de autenticação preserva link e rejeita destino externo', () => {
  assert.equal(authDestination('/invite/test'), '/invite/test')
  assert.deepEqual(authQuery('/invite/test'), { redirect: '/invite/test' })
  for (const value of [
    '//evil.test',
    'https://evil.test',
    '/\\evil.test',
    '/\n/evil',
    undefined,
    [],
  ])
    assert.deepEqual(authDestination(value), { name: 'home' })
})
test('erros não serializam requisição e distinguem permissão, ausência e rede', () => {
  assert.match(teamError({ response: { status: 403 } }), /permissão/)
  assert.match(teamError({ response: { status: 404 } }), /não existe/)
  assert.match(teamError({ response: { status: 500 } }), /servidor/)
  assert.doesNotMatch(teamError({ config: { token: 'segredo' } }), /segredo/)
  assert.equal(
    teamError({ response: { status: 400, data: { invited_user: ['Convite duplicado.'] } } }),
    'Convite duplicado.',
  )
})
test('paginação inclui 207 registros e não retorna resultado parcial em falha', async () => {
  const pages = []
  const data = await loadProjectPages(async (page) => {
    pages.push(page)
    return { total_pages: 3, results: Array(page === 3 ? 7 : 100).fill({}) }
  })
  assert.equal(data.length, 207)
  assert.deepEqual(pages, [1, 2, 3])
  await assert.rejects(
    loadProjectPages(async (page) => {
      if (page === 2) throw new Error('falha')
      return { total_pages: 2, results: [{}] }
    }),
  )
})
