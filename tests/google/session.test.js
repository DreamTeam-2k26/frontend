import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'

let server, api, useAuthStore, tokens, routes
const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
}
before(async () => {
  server = await createServer({
    configFile: false,
    plugins: [
      {
        name: 'auth-test-dependencies',
        enforce: 'pre',
        resolveId(id) {
          if (id === '@/router' || id === '\0test-router') return '\0test-router'
          if (id === 'vue3-toastify' || id === '\0test-toast') return '\0test-toast'
        },
        load(id) {
          if (id === '\0test-router')
            return `export const pushes = []; export default {currentRoute: {value: {name: 'profile', fullPath: '/profile'}}, push: (...args) => pushes.push(args)}`
          if (id === '\0test-toast')
            return 'export const toast = {loading(){}, update(){}, success(){}}'
        },
      },
    ],
    resolve: {
      alias: [
        { find: /^vue3-toastify$/, replacement: '\0test-toast' },
        { find: /^@\/router$/, replacement: '\0test-router' },
        { find: '@', replacement: fileURLToPath(new URL('../../src', import.meta.url)) },
      ],
    },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify('https://api.fluxo.example/api'),
      'import.meta.env.VITE_ACCESS_TOKEN_KEY': JSON.stringify('test-access'),
      'import.meta.env.VITE_REFRESH_TOKEN_KEY': JSON.stringify('test-refresh'),
    },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  api = (await server.ssrLoadModule('/src/api/api.js')).default
  tokens = await server.ssrLoadModule('/src/utils/token.js')
  useAuthStore = (await server.ssrLoadModule('/src/stores/auth.js')).useAuthStore
  routes = await server.ssrLoadModule('\0test-router')
})
after(async () => {
  await server?.close()
})
function reply(config, data, status = 200) {
  const response = { data, status, statusText: '', headers: {}, config }
  if (status >= 400) return Promise.reject({ config, response })
  return Promise.resolve(response)
}
function store() {
  storage.clear()
  globalThis.window = { location: { origin: 'https://fluxo.example' } }
  setActivePinia(createPinia())
  return useAuthStore()
}

test('Google usa JWT Fluxo, busca perfil real e bloqueia POST duplicado', async () => {
  const auth = store()
  let release
  const calls = []
  api.defaults.adapter = async (config) => {
    calls.push(config.url)
    if (config.url === '/auth/google/') {
      assert.deepEqual(JSON.parse(config.data), { credential: 'google-id-token' })
      await new Promise((resolve) => {
        release = resolve
      })
      return reply(config, { access: 'fluxo-access', refresh: 'fluxo-refresh' })
    }
    assert.equal(config.headers.Authorization, 'Bearer fluxo-access')
    return reply(config, { id: 7, name: 'Perfil real' })
  }
  const first = auth.loginGoogle('google-id-token')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(await auth.loginGoogle('duplicate'), false)
  assert.equal(await auth.login({ email: 'a', password: 'b' }), false)
  release()
  assert.equal(await first, true)
  assert.deepEqual(calls, ['/auth/google/', '/users/me/'])
  assert.equal(auth.user.name, 'Perfil real')
  assert.equal(tokens.getAccessToken(), 'fluxo-access')
  assert.equal(tokens.getRefreshToken(), 'fluxo-refresh')
  assert.ok(![...storage.values()].includes('google-id-token'))
  assert.equal(auth.loading, false)
})

test('Google 400/401/403/409/503 e rede preservam JWT e permitem retentativa', async () => {
  for (const status of [400, 401, 403, 409, 503, null]) {
    const auth = store()
    tokens.setAccessToken('existing')
    tokens.setRefreshToken('existing-refresh')
    let calls = 0
    api.defaults.adapter = (config) => {
      calls++
      if (!status) return Promise.reject({ config })
      return reply(
        config,
        { code: status === 409 ? 'account_link_required' : 'invalid_google_token' },
        status,
      )
    }
    await assert.rejects(auth.loginGoogle('credential'))
    assert.equal(calls, 1)
    assert.equal(tokens.getAccessToken(), 'existing')
    assert.equal(tokens.getRefreshToken(), 'existing-refresh')
    assert.equal(auth.loading, false)
  }
  assert.equal(routes.pushes.length, 0)
})

test('vínculo envia JWT; 401 e conflitos preservam sessão; sem sessão não envia POST', async () => {
  const auth = store()
  let calls = 0
  api.defaults.adapter = (config) => {
    calls++
    return reply(config, {})
  }
  await assert.rejects(auth.linkGoogle('credential'))
  assert.equal(calls, 0)
  tokens.setAccessToken('existing')
  tokens.setRefreshToken('existing-refresh')
  for (const status of [401, 409, 503, 200]) {
    api.defaults.adapter = (config) => {
      assert.equal(config.headers.Authorization, 'Bearer existing')
      assert.equal(config.url, '/auth/google/link/')
      return reply(
        config,
        status === 200 ? { linked: true } : { code: 'invalid_google_token' },
        status,
      )
    }
    if (status === 200) assert.equal((await auth.linkGoogle('credential')).linked, true)
    else await assert.rejects(auth.linkGoogle('credential'))
    assert.equal(tokens.getAccessToken(), 'existing')
    assert.equal(tokens.getRefreshToken(), 'existing-refresh')
  }
  assert.equal(routes.pushes.length, 0)
})

test('login e registro por senha continuam usando endpoints e JWT existentes', async () => {
  const auth = store()
  const calls = []
  api.defaults.adapter = (config) => {
    calls.push([config.url, JSON.parse(config.data)])
    return reply(config, { access: 'password-access', refresh: 'password-refresh' })
  }
  await auth.login({ email: 'test@example.test', password: 'password' })
  assert.equal(tokens.getAccessToken(), 'password-access')
  await auth.register({ name: 'Pessoa', email: 'test@example.test', password: 'password' })
  assert.deepEqual(
    calls.map(([url]) => url),
    ['/token/', '/register/', '/token/'],
  )
  assert.equal(calls[1][1].name, 'Pessoa')
  assert.equal(tokens.getRefreshToken(), 'password-refresh')
  auth.logout()
  assert.equal(tokens.getAccessToken(), null)
  assert.equal(auth.user, null)
})

test('resposta Google incompleta não substitui sessão existente', async () => {
  const auth = store()
  tokens.setAccessToken('existing')
  tokens.setRefreshToken('existing-refresh')
  api.defaults.adapter = (config) => reply(config, { access: 'incomplete' })
  await assert.rejects(auth.loginGoogle('credential'))
  assert.equal(tokens.getAccessToken(), 'existing')
  assert.equal(tokens.getRefreshToken(), 'existing-refresh')
})

test('logout durante POST Google impede resposta tardia de recriar sessão', async () => {
  const auth = store()
  let release
  api.defaults.adapter = async (config) => {
    await new Promise((resolve) => {
      release = resolve
    })
    return reply(config, { access: 'late-access', refresh: 'late-refresh' })
  }
  const request = auth.loginGoogle('credential')
  await new Promise((resolve) => setTimeout(resolve, 0))
  auth.logout()
  release()
  assert.equal(await request, false)
  assert.equal(tokens.getAccessToken(), null)
  assert.equal(tokens.getRefreshToken(), null)
})

test('endpoint privado continua renovando JWT pelo fluxo existente', async () => {
  const { default: axios } = await import('axios')
  const original = axios.defaults.adapter
  const auth = store()
  tokens.setAccessToken('expired')
  tokens.setRefreshToken('refresh')
  let attempts = 0
  axios.defaults.adapter = (config) => {
    assert.match(config.url, /token\/refresh\/$/)
    return reply(config, { access: 'renewed' })
  }
  api.defaults.adapter = (config) => {
    attempts++
    if (attempts === 1) return reply(config, {}, 401)
    assert.equal(config.headers.Authorization, 'Bearer renewed')
    return reply(config, { name: 'Perfil atualizado' })
  }
  try {
    await auth.fetchUser()
    assert.equal(attempts, 2)
    assert.equal(tokens.getAccessToken(), 'renewed')
    assert.equal(auth.user.name, 'Perfil atualizado')
  } finally {
    axios.defaults.adapter = original
  }
})
