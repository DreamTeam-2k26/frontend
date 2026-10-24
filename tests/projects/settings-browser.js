// Harness manual: apenas no servidor de desenvolvimento, fora do build do produto.
import api from '../../src/api/api.js'
import router from '../../src/router/index.js'
import { setAccessToken } from '../../src/utils/token.js'

const state = (window.settingsTest = {
  role: 'owner',
  status: null,
  delay: 0,
  calls: [],
  project: {
    id: 1,
    name: 'Horta comunitária',
    description: 'Planejamento da horta e das atividades da equipe.',
    created_at: '2026-10-20T12:00:00Z',
  },
})
setAccessToken(
  `fixture.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.fixture`,
)
api.defaults.adapter = async (config) => {
  state.calls.push({ method: config.method, url: config.url, data: config.data })
  const status = state.onlyWrite && config.method === 'get' ? null : state.status
  const data = {
    ...state.project,
    role: state.role,
    id: Number(config.url.match(/^\/projects\/(\d+)\//)?.[1] ?? 1),
  }
  const delay = state.delay
  await new Promise((resolve) => setTimeout(resolve, delay))
  if (status === 'network') throw new Error('Rede indisponível')
  if (status && config.url.startsWith('/projects/')) {
    throw Object.assign(new Error('Resposta controlada'), {
      response: { status, data: status === 400 ? { name: ['Nome inválido.'] } : {} },
    })
  }
  let result = []
  if (config.url === '/users/me/')
    result = { id: 5, name: 'Pessoa de teste', email: 'teste@example.test' }
  else if (/^\/projects\/\d+\/$/.test(config.url)) {
    if (config.method === 'patch') Object.assign(state.project, JSON.parse(config.data))
    result =
      config.method === 'patch'
        ? { id: data.id, name: state.project.name, description: state.project.description }
        : data
  } else if (config.url === '/projects/') result = [{ ...state.project, role: state.role }]
  return {
    data: result,
    status: ['delete', 'post'].includes(config.method) ? 204 : 200,
    config,
    headers: {},
  }
}
window.settingsRouter = router
await router.push('/projects/1/settings')
await import('../../src/main.js')
