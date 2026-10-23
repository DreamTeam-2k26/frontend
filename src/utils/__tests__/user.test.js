import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getInitials } from '../user.js'

test('usa a inicial das duas primeiras palavras', () => {
  assert.equal(getInitials('Renan Lima Souza'), 'RL')
})

test('nome de uma palavra gera uma inicial', () => {
  assert.equal(getInitials('ana'), 'A')
})

test('ignora espaços extras', () => {
  assert.equal(getInitials('  Maria   Clara  '), 'MC')
})

test('nome vazio ou ausente gera string vazia', () => {
  assert.equal(getInitials(''), '')
  assert.equal(getInitials('   '), '')
  assert.equal(getInitials(null), '')
  assert.equal(getInitials(undefined), '')
})
