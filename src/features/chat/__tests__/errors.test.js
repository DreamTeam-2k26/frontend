import assert from 'node:assert/strict'
import { test } from 'node:test'

import { apiErrorMessage } from '../lib/errors.js'

const fail = (status, data) => ({ response: { status, data } })

test('usa detail, depois o primeiro erro de campo, depois lista simples', () => {
  assert.equal(
    apiErrorMessage(fail(404, { detail: 'Sala não encontrada.' })),
    'Sala não encontrada.',
  )
  assert.equal(
    apiErrorMessage(fail(400, { name: ['Este campo é obrigatório.'] })),
    'Este campo é obrigatório.',
  )
  assert.equal(apiErrorMessage(fail(400, ['Envie texto ou arquivo.'])), 'Envie texto ou arquivo.')
  assert.equal(apiErrorMessage(fail(400, { non_field_errors: ['Ruim.'] })), 'Ruim.')
})

test('erros especiais e fallback', () => {
  assert.equal(apiErrorMessage(fail(413, '')), 'O arquivo é grande demais.')
  assert.match(apiErrorMessage(fail(500, '<html>')), /Erro no servidor/)
  assert.equal(apiErrorMessage(fail(400, {})), 'Não foi possível concluir a ação. Tente novamente.')
  assert.equal(apiErrorMessage({ code: 'ERR_NETWORK' }), 'Sem conexão com o servidor.')
  assert.equal(apiErrorMessage(new Error('x'), 'ops'), 'ops')
})
