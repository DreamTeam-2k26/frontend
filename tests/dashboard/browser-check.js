// Fixture exclusiva de teste. Não é importada pelo aplicativo.
import { createApp, h, nextTick } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory, RouterView } from 'vue-router'
import original from '../../src/router/index.js'
import api from '../../src/api/api.js'
import { useChatStore } from '../../src/features/chat/stores/chat.js'
import '../../src/assets/main.css'

const params = new URLSearchParams(location.search)
const scenario = params.get('scenario') || 'success'
const pause = (time = 100) => new Promise((resolve) => setTimeout(resolve, time))
const checks = []
const check = (name, pass) => checks.push({ name, pass: !!pass })
let failing = scenario === 'error'
let posts = 0
let pages = []
const projects =
  scenario === 'empty'
    ? []
    : [
        {
          id: 1,
          name: 'Feira de Ciências 2026',
          description: 'Ciências · 3º ano',
          role: 'owner',
          updated_at: '2026-10-03',
          progress: 68,
          total_memberships: 5,
          memberships: [],
        },
        {
          id: 2,
          name: 'Semana do Meio Ambiente',
          description: 'Evento escolar · 2º ano',
          role: 'member',
          updated_at: '2026-10-02',
          progress: 40,
          total_memberships: 8,
          memberships: [],
        },
        {
          id: 3,
          name: 'Trabalho de História',
          description: 'Apresentação em grupo',
          role: 'admin',
          updated_at: '2026-10-01',
          progress: 82,
          total_memberships: 4,
          memberships: [],
        },
        {
          id: 4,
          name: 'Projeto mais recente',
          description: 'Atualizado na segunda página',
          role: 'member',
          updated_at: '2026-10-04',
        },
      ]
if (scenario === 'offline')
  Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
if (params.get('theme') === 'dark') document.documentElement.dataset.theme = 'dark'
api.defaults.adapter = async (config) => {
  await pause(50)
  let data
  if (config.url === '/users/me/') {
    if (scenario === 'profile-error') throw new Error('Perfil indisponível')
    data = { id: 1, name: 'Renan Lima' }
  } else if (/^\/projects\/\d+\/$/.test(config.url)) {
    data = projects.find((project) => project.id === Number(config.url.split('/')[2]))
    if (!data) throw new Error('Projeto inexistente')
  } else if (config.url === '/projects/' && config.method === 'post') {
    posts++
    const values = JSON.parse(config.data)
    data = { id: 5, ...values, role: 'owner' }
    projects.push({ ...data, updated_at: '2026-10-23' })
  } else if (config.url === '/projects/') {
    if (failing) throw new Error('Network Error')
    const page = config.params.page
    pages.push(page)
    data = {
      results: page === 1 ? projects.slice(0, 3) : projects.slice(3),
      total_pages: projects.length > 3 ? 2 : 1,
    }
  } else throw new Error(`Requisição não prevista: ${config.url}`)
  return { data, status: 200, statusText: 'OK', headers: {}, config }
}
const $ = (selector) => document.querySelector(selector)
const report = () => {
  const pre = document.createElement('pre')
  pre.id = 'test-results'
  pre.textContent = JSON.stringify(checks)
  document.body.append(pre)
}
window.addEventListener('unhandledrejection', (event) => {
  check(String(event.reason), false)
  report()
})
window.addEventListener('error', (event) => {
  check(event.message, false)
  report()
})
const router = createRouter({ history: createMemoryHistory(), routes: original.options.routes })
await router.push('/')
await router.isReady()
const pinia = createPinia()
// O teste da Home não inicializa WebSocket nem chamadas do chat.
useChatStore(pinia).start = () => {}
createApp({ render: () => h(RouterView) })
  .use(pinia)
  .use(router)
  .mount('#app')
await nextTick()
check('loading ou offline visível', !!$('.dashboard__loading') || scenario === 'offline')
await pause(900)
await nextTick()
check(
  'saudação correta',
  $('#dashboard-title').textContent ===
    (scenario === 'profile-error' ? 'Olá! Que bom ter você aqui.' : 'Olá, Renan.'),
)
if (scenario === 'offline') {
  check('offline sem requisições de projetos', pages.length === 0)
  check('criação bloqueada offline', $('#dashboard-new-project').disabled)
  check('aviso offline', $('.dashboard__notice').textContent.includes('offline'))
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  window.dispatchEvent(new Event('online'))
  await pause(300)
  check('recuperação ao reconectar', !!$('.recent-projects'))
} else if (scenario === 'empty') {
  check('primeiro acesso sem números fictícios', !!$('.empty') && !$('.stat-card'))
  check('ação criar projeto disponível', !$('#dashboard-new-project').disabled)
} else {
  if (scenario === 'error') {
    check('erro sem contagem parcial', !!$('.dashboard__notice[role="alert"]') && !$('.stat-card'))
    failing = false
    $('.dashboard__notice button').click()
    await pause(300)
    check('retry recupera projetos', !!$('.recent-projects'))
  }
  check('todas as páginas', pages.includes(1) && pages.includes(2))
  check(
    'três projetos recentes',
    document.querySelectorAll('.recent-projects__list > li').length === 3,
  )
  check(
    'mais recente vem da segunda página',
    $('.recent-projects__list h2').textContent === 'Projeto mais recente',
  )
  check(
    'contagens completas',
    [...document.querySelectorAll('.stat-card__value')].map((el) => el.textContent).join(',') ===
      '4,2',
  )
  check('métrica ausente omitida', !$('.recent-projects__list > li:first-child progress'))
  check('link real para projetos', $('.recent-projects__link').getAttribute('href') === '/projects')
  if (!params.has('preview')) {
    $('#dashboard-new-project').focus()
    $('#dashboard-new-project').click()
    await nextTick()
    check('formulário existente abre', !!$('dialog[open]'))
    const input = $('dialog input[name="name"]')
    input.value = 'Novo projeto da Home'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    $('dialog form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await pause(400)
    check('cria uma única vez', posts === 1)
    check('revalida lista e métricas', $('.stat-card__value').textContent === '5')
    check('foco retorna ao disparador', document.activeElement.id === 'dashboard-new-project')
    check('sucesso anunciado', !!$('.dashboard__success[role="status"]'))
  }
}
check('sem overflow horizontal', document.documentElement.scrollWidth <= innerWidth)
const mobile = innerWidth < 768
check('Sidebar preservada', getComputedStyle($('.sidebar')).display === (mobile ? 'none' : 'flex'))
check(
  'navegação mobile preservada',
  getComputedStyle($('.mobile-nav')).display === (mobile ? 'flex' : 'none'),
)
if (!params.has('preview') && scenario === 'success') {
  $('.project-card__actions a').click()
  await pause(300)
  check(
    'abre detalhes reais do projeto selecionado',
    $('#project-title')?.textContent === 'Novo projeto da Home',
  )
  check('detalhes sem erro', !$('.project-detail [role="alert"]'))
}
if (!params.has('preview')) report()
