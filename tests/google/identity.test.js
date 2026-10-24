import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mountGoogleButton } from '../../src/services/googleIdentity.js'
import { googleAuthError } from '../../src/utils/googleAuthError.js'
import { authDestination, authQuery } from '../../src/utils/authRedirect.js'

test('GIS inicializa uma vez; callback exige clique, ignora duplicata e desmontagem', async () => {
  let configuration
  const buttons = []
  let initializes = 0
  globalThis.window = {
    google: {
      accounts: {
        id: {
          initialize(config) {
            configuration = config
            initializes++
          },
          renderButton(element, options) {
            buttons.push(options)
          },
        },
      },
    },
  }
  const element = () => ({ clientWidth: 320, replaceChildren() {} })
  const received = []
  let complete
  const first = await mountGoogleButton(element(), {
    clientId: 'test-client',
    theme: 'outline',
    disabled: () => false,
    onCredential: async (credential) => {
      received.push(credential)
      await new Promise((resolve) => {
        complete = resolve
      })
    },
  })
  await configuration.callback({ credential: 'ignored-without-click' })
  assert.deepEqual(received, [])
  buttons[0].click_listener()
  const request = configuration.callback({ credential: 'id-token', state: buttons[0].state })
  buttons[0].click_listener()
  await configuration.callback({ credential: 'duplicate', state: buttons[0].state })
  assert.deepEqual(received, ['id-token'])
  complete()
  await request
  first()
  const dispose = await mountGoogleButton(element(), {
    clientId: 'test-client',
    theme: 'filled_black',
    disabled: () => false,
    onCredential: () => assert.fail('callback after unmount'),
  })
  buttons[1].click_listener()
  dispose()
  await configuration.callback({ credential: 'late', state: buttons[1].state })
  assert.equal(initializes, 1)
  assert.equal(buttons[1].theme, 'filled_black')
  let blocked = true
  await mountGoogleButton(element(), {
    clientId: 'test-client',
    disabled: () => blocked,
    onCredential: () => assert.fail('disabled'),
  })
  buttons[2].click_listener()
  await configuration.callback({ credential: 'disabled', state: buttons[2].state })
  blocked = false
  buttons[2].click_listener()
  await configuration.callback({ credential: 'old-popup', state: buttons[0].state })
  await assert.rejects(mountGoogleButton(element(), { clientId: '' }), /não configurado/)
})

test('erros conhecidos e desconhecidos nunca reproduzem credential nem detalhe arbitrário', () => {
  for (const code of [
    'account_link_required',
    'google_account_in_use',
    'already_linked',
    'invalid_google_token',
    'inactive_account',
    'google_auth_unavailable',
  ]) {
    const result = googleAuthError({ response: { status: 409, data: { code, detail: 'SECRET' } } })
    assert.doesNotMatch(result, /SECRET/)
  }
  assert.match(
    googleAuthError({ response: { data: { code: 'account_link_required' } } }),
    /senha.*Perfil/,
  )
  assert.match(googleAuthError({ response: { status: 401 } }, true), /sessão/)
  assert.doesNotMatch(googleAuthError({ message: 'SECRET' }), /SECRET/)
})

test('Login e Cadastro preservam convite e rejeitam retorno externo', () => {
  assert.equal(authDestination('/invite/test?next=1'), '/invite/test?next=1')
  assert.deepEqual(authQuery('/invite/test'), { redirect: '/invite/test' })
  for (const value of [
    '//evil.test',
    '/\\evil.test',
    'https://evil.test',
    '/\r\nevil',
    [],
    undefined,
  ]) {
    assert.deepEqual(authDestination(value), { name: 'home' })
  }
})
