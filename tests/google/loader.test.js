import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadGoogleIdentity, mountGoogleButton } from '../../src/services/googleIdentity.js'

test('carregamento único, falha de rede e retentativa; não renderiza após desmontar', async () => {
  // Import isolado evita compartilhar configuração GIS de outros cenários.
  const identity = await import('../../src/services/googleIdentity.js?loader-test')
  const scripts = []
  globalThis.window = {}
  globalThis.document = {
    createElement: () => ({
      remove() {
        this.removed = true
      },
    }),
    head: {
      append(script) {
        scripts.push(script)
      },
    },
  }
  const first = identity.loadGoogleIdentity()
  const duplicate = identity.loadGoogleIdentity()
  assert.equal(first, duplicate)
  assert.equal(scripts.length, 1)
  assert.equal(scripts[0].src, 'https://accounts.google.com/gsi/client')
  scripts[0].onerror()
  await assert.rejects(first, /carregar o Google/)
  assert.equal(scripts[0].removed, true)
  const retry = identity.loadGoogleIdentity()
  assert.equal(scripts.length, 2)
  let rendered = false
  const gis = {
    initialize() {},
    renderButton() {
      rendered = true
    },
  }
  window.google = { accounts: { id: gis } }
  scripts[1].onload()
  assert.equal(await retry, gis)
  await identity.mountGoogleButton({}, { clientId: 'test', isCurrent: () => false })
  assert.equal(rendered, false)
  assert.equal(typeof loadGoogleIdentity, 'function')
  assert.equal(typeof mountGoogleButton, 'function')
})
