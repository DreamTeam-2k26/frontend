import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

let server
let Card
before(async () => {
  server = await createServer({
    configFile: false,
    plugins: [vue()],
    resolve: { alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) } },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  Card = (await server.ssrLoadModule('/src/components/projects/ProjectCard.vue')).default
})
after(async () => {
  await server?.close()
})

const project = {
  id: 24,
  name: 'Feira de Ciências',
  description: 'Ciências · 3º ano',
  role: 'member',
  progress: 68,
  total_memberships: 5,
  memberships: [
    { id: 1, profile_picture: 'https://cdn.example.test/photo.png' },
    { id: 2, profile_picture: null },
    { id: 3, profile_picture: '/media/photo.png' },
    { id: 4, profile_picture: null },
    { id: 5, profile_picture: null },
  ],
}
const render = (overrides = {}) =>
  renderToString(
    createSSRApp({
      render: () => h(Card, { project: { ...project, ...overrides } }),
    }),
  )

test('card renderiza progresso e total reais, três avatares e quantidade excedente', async () => {
  const html = await render()
  assert.match(html, /<progress[^>]*value="68"[^>]*max="100"/)
  assert.match(html, /68%/)
  assert.match(html, /5 participantes/)
  assert.match(html, /Mais 2 participantes/)
  assert.equal((html.match(/class="member-avatar"/g) ?? []).length, 3)
  assert.match(html, /src="https:\/\/cdn.example.test\/photo.png"/)
  assert.match(html, /src="[^"]*\/media\/photo.png"/)
  assert.doesNotMatch(html, /Editar Feira/)
})

test('zero e cem por cento são valores válidos, não estados de ausência', async () => {
  for (const progress of [0, 100]) {
    const html = await render({
      progress,
      total_memberships: 1,
      memberships: [{ id: 1, profile_picture: null }],
    })
    assert.match(html, new RegExp(`<progress[^>]*value="${progress}"`))
    assert.match(html, /1 participante</)
    assert.doesNotMatch(html, /Mais \d+ participantes|<img/)
    assert.match(html, /aria-label="Participante 1"/)
  }
})

test('resposta básica de criação não inventa métricas antes da revalidação', async () => {
  const html = await render({
    progress: undefined,
    total_memberships: undefined,
    memberships: undefined,
  })
  assert.doesNotMatch(html, /<progress|class="member-avatar"/)
  assert.match(html, /Participantes indisponíveis/)
  assert.match(html, /Indisponível/)
})

test('owner e admin mantêm edição com o novo rodapé e conteúdo escapado', async () => {
  for (const role of ['owner', 'admin']) {
    const html = await render({ role, name: '<script>teste</script>' })
    assert.match(html, /Editar &lt;script&gt;teste&lt;\/script&gt;/)
    assert.doesNotMatch(html, /<script>/)
  }
})
