import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  apiMessage,
  canChangeRole,
  canInvite,
  canRemove,
  inviteMany,
  inviteSummary,
  roleLabel,
} from '../../src/components/projects/memberRules.js'

const owner = { user: 1, role: 'owner' }
const admin = { user: 2, role: 'admin' }
const member = { user: 3, role: 'member' }

test('rótulos de papel em português', () => {
  assert.deepEqual(['owner', 'admin', 'member', 'x'].map(roleLabel), [
    'Dono',
    'Administrador',
    'Membro',
    'Participante',
  ])
})

test('só dono e administrador convidam', () => {
  assert.deepEqual(['owner', 'admin', 'member', undefined].map(canInvite), [
    true,
    true,
    false,
    false,
  ])
})

test('só o dono troca papéis e nunca o do dono', () => {
  assert.equal(canChangeRole('owner', admin), true)
  assert.equal(canChangeRole('owner', member), true)
  assert.equal(canChangeRole('owner', owner), false)
  assert.equal(canChangeRole('admin', member), false)
  assert.equal(canChangeRole('member', member), false)
})

test('remoção: dono tira admin/membro, admin tira só membro, ninguém tira a si nem o dono', () => {
  assert.equal(canRemove('owner', admin, 1), true)
  assert.equal(canRemove('owner', member, 1), true)
  assert.equal(canRemove('owner', owner, 99), false)
  assert.equal(canRemove('admin', member, 2), true)
  assert.equal(canRemove('admin', admin, 99), false)
  assert.equal(canRemove('admin', owner, 2), false)
  assert.equal(canRemove('member', member, 9), false)
  assert.equal(canRemove('owner', { user: 1, role: 'admin' }, 1), false)
})

test('mensagem da API: detail, campo, lista ou texto simples', () => {
  assert.equal(
    apiMessage({ response: { data: { detail: 'Sem permissão.' } } }, 'x'),
    'Sem permissão.',
  )
  assert.equal(
    apiMessage({ response: { data: { invited_user: ['Já participa do projeto.'] } } }, 'x'),
    'Já participa do projeto.',
  )
  assert.equal(
    apiMessage({ response: { data: { non_field_errors: ['Erro geral.'] } } }, 'x'),
    'Erro geral.',
  )
  assert.equal(apiMessage({ response: { data: 'Falha' } }, 'x'), 'Falha')
  assert.equal(apiMessage(new Error('rede'), 'Padrão'), 'Padrão')
})

test('inviteMany envia um a um e separa os que falharam', async () => {
  const calls = []
  const send = async (projectId, userId) => {
    calls.push([projectId, userId])
    if (userId === 2)
      throw { response: { data: { invited_user: ['Já existe um convite pendente.'] } } }
  }
  const users = [
    { id: 1, name: 'Ana' },
    { id: 2, name: 'Beto' },
    { id: 3, name: 'Caio' },
  ]
  const result = await inviteMany(10, users, send)

  assert.deepEqual(calls, [
    [10, 1],
    [10, 2],
    [10, 3],
  ])
  assert.deepEqual(
    result.sent.map((u) => u.id),
    [1, 3],
  )
  assert.deepEqual(result.failed, [{ user: users[1], message: 'Já existe um convite pendente.' }])
})

test('resumo dos convites', () => {
  assert.equal(inviteSummary({ sent: [{ name: 'A' }], failed: [] }), 'Convite enviado a 1 pessoa.')
  assert.equal(inviteSummary({ sent: [{}, {}], failed: [] }), 'Convites enviados a 2 pessoas.')
  assert.match(
    inviteSummary({ sent: [{}], failed: [{ user: { name: 'Beto' }, message: 'Erro' }] }),
    /Convite enviado a 1 pessoa\. Não foi possível convidar: Beto \(Erro\)/,
  )
  assert.equal(inviteSummary({ sent: [], failed: [] }), '')
})
