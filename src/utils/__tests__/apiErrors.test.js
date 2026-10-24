import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apiErrorMessage, apiFieldErrors } from '../apiErrors.js'

const response = (status, data) => ({ response: { status, data } })

test('usa o detail do servidor quando existe', () => {
  assert.equal(
    apiErrorMessage(response(400, { detail: 'A coluna tem tarefas.' }), 'Falhou.'),
    'A coluna tem tarefas.',
  )
})

test('mensagens padrão por status', () => {
  assert.match(apiErrorMessage(response(401, {}), 'x'), /sessão expirou/i)
  assert.match(apiErrorMessage(response(403, {}), 'x'), /permissão/i)
  assert.match(apiErrorMessage(response(404, {}), 'x'), /não foi encontrad/i)
  assert.match(apiErrorMessage(response(500, {}), 'Falhou.'), /Falhou\./)
})

test('sem resposta é falha de rede', () => {
  assert.match(apiErrorMessage(new Error('Network Error'), 'x'), /conectar/i)
})

test('400 com erro de campo usa a primeira mensagem', () => {
  assert.equal(
    apiErrorMessage(response(400, { title: ['Este campo é obrigatório.'] }), 'Confira.'),
    'Este campo é obrigatório.',
  )
  assert.equal(
    apiErrorMessage(response(400, { non_field_errors: ['Inválido.'] }), 'x'),
    'Inválido.',
  )
})

test('apiFieldErrors devolve só os campos pedidos', () => {
  const error = response(400, {
    title: ['Muito longo.'],
    due_date: 'Prazo inválido.',
    other: ['x'],
  })
  assert.deepEqual(apiFieldErrors(error, ['title', 'due_date']), {
    title: 'Muito longo.',
    due_date: 'Prazo inválido.',
  })
  assert.deepEqual(apiFieldErrors(response(500, {}), ['title']), {})
})
