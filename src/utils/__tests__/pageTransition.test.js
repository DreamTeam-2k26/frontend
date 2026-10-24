import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pageKey } from '../pageTransition.js'

const route = (name, params = {}, query = {}) => ({ name, params, query, fullPath: 'ignorado' })

test('mesma página com outra query (?aba=, ?task=, pasta) mantém a chave', () => {
  assert.equal(
    pageKey(route('project-detail', { id: '3' }, { aba: 'pastas' })),
    pageKey(route('project-detail', { id: '3' }, { aba: 'geral', pasta: '9' })),
  )
  assert.equal(
    pageKey(route('project-kanban', { id: '3' }, { task: '12' })),
    pageKey(route('project-kanban', { id: '3' })),
  )
})

test('trocar de conversa no chat não remonta a página (conexão preservada)', () => {
  assert.equal(pageKey(route('chat', { roomId: '1' })), pageKey(route('chat', { roomId: '2' })))
})

test('outra página ou outro projeto muda a chave', () => {
  assert.notEqual(
    pageKey(route('project-detail', { id: '3' })),
    pageKey(route('project-kanban', { id: '3' })),
  )
  assert.notEqual(
    pageKey(route('project-detail', { id: '3' })),
    pageKey(route('project-detail', { id: '4' })),
  )
})

test('outra chamada muda a chave', () => {
  assert.notEqual(
    pageKey(route('call', { id: '3', callId: '1' })),
    pageKey(route('call', { id: '3', callId: '2' })),
  )
})
