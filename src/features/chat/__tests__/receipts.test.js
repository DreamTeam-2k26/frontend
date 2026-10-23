import test from 'node:test'
import assert from 'node:assert/strict'
import { messageStatus, onlineCount } from '../lib/receipts.js'

const members = [
  { user: { id: 1 }, online: true, last_seen: null },
  { user: { id: 2 }, online: false, last_seen: '2026-01-01T10:00:00Z' },
]
const message = { created: '2026-01-01T12:00:00Z', read: false }

test('lida por todos: verde', () => {
  assert.equal(messageStatus({ ...message, read: true }, { members, authorId: 1 }), 'read')
})

test('destinatário offline desde antes do envio: só enviada', () => {
  assert.equal(messageStatus(message, { members, authorId: 1 }), 'sent')
})

test('destinatário online: entregue', () => {
  const presence = { 2: { online: true, last_seen: null } }
  assert.equal(messageStatus(message, { members, presence, authorId: 1 }), 'delivered')
})

test('destinatário saiu depois do envio: entregue', () => {
  const presence = { 2: { online: false, last_seen: '2026-01-01T12:30:00Z' } }
  assert.equal(messageStatus(message, { members, presence, authorId: 1 }), 'delivered')
})

test('em grupo, basta um ausente para continuar como enviada', () => {
  const group = [...members, { user: { id: 3 }, online: true, last_seen: null }]
  assert.equal(messageStatus(message, { members: group, authorId: 1 }), 'sent')
})

test('sem membros carregados: enviada', () => {
  assert.equal(messageStatus(message, { authorId: 1 }), 'sent')
})

test('onlineCount usa a presença ao vivo antes do snapshot', () => {
  assert.equal(onlineCount(members, {}), 1)
  assert.equal(onlineCount(members, { 2: { online: true } }), 2)
  assert.equal(onlineCount(members, { 1: { online: false } }), 0)
})
