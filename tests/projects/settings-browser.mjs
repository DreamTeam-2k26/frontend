import { writeFile } from 'node:fs/promises'
import { Buffer } from 'node:buffer'
const targets = await (await fetch('http://127.0.0.1:9229/json')).json()
const ws = new WebSocket(targets.find((x) => x.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let seq = 0
const pending = new Map()
ws.addEventListener('message', ({ data }) => {
  const m = JSON.parse(data)
  if (m.id) {
    const p = pending.get(m.id)
    pending.delete(m.id)
    if (m.error) p.reject(m.error)
    else p.resolve(m.result)
  }
})
const cmd = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
const run = async (expression) => {
  const r = await cmd('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails))
  return r.result.value
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const wait = async (expression) => {
  for (let n = 0; n < 80; n++) {
    if (await run(expression)) return
    await sleep(100)
  }
  throw Error('Timeout: ' + expression)
}
const check = async (expression, label) => {
  if (!(await run(expression))) throw Error(label)
  console.log('PASS', label)
}
const click = (label) =>
  run(
    `{const button=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(label)});button?.focus();button?.click()}`,
  )
const reset = async (role = 'owner') => {
  await run(
    `settingsTest.role=${JSON.stringify(role)};settingsTest.status=null;settingsTest.onlyWrite=false;settingsTest.delay=0;settingsRouter.push('/projects/'+(settingsRouter.currentRoute.value.params.id==='1'?'2':'1')+'/settings')`,
  )
  await wait(`!!document.querySelector('#project-information')`)
}
await cmd('Page.enable')
await cmd('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1100,
  deviceScaleFactor: 1,
  mobile: false,
})
await cmd('Page.navigate', { url: 'http://127.0.0.1:5178/tests/projects/settings-browser.html' })
await wait(`!!document.querySelector('#settings-project-name')`)
await check(
  `document.body.textContent.includes('Transfira a propriedade antes de sair') && ![...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Sair do projeto')`,
  'owner bloqueado na saída',
)
await click('Excluir projeto')
await wait(`!!document.querySelector('dialog[open]')`)
await click('Cancelar')
await check(`!settingsTest.calls.some(x=>x.method==='delete')`, 'cancelamento não envia DELETE')
await run(
  `document.querySelector('#settings-project-name').value=' ';document.querySelector('#settings-project-name').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('form').requestSubmit()`,
)
await wait(`!!document.querySelector('[aria-invalid=true]')`)
await check(`!settingsTest.calls.some(x=>x.method==='patch')`, 'nome vazio bloqueia PATCH')
await run(
  `document.querySelector('#settings-project-name').value='Projeto atualizado';document.querySelector('#settings-project-name').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('form').requestSubmit();document.querySelector('form').requestSubmit()`,
)
await wait(`document.body.textContent.includes('Projeto atualizado com sucesso.')`)
await check(
  `settingsTest.calls.filter(x=>x.method==='patch').length===1`,
  'PATCH sem dupla submissão',
)
await check(
  `document.querySelector('#app-sidebar').textContent.includes('Projeto atualizado')`,
  'nome da sidebar atualizado sem F5',
)
await reset('member')
await check(
  `!document.querySelector('form') && ![...document.querySelectorAll('button')].some(x=>x.textContent.trim()==='Excluir projeto')`,
  'member sem edição/exclusão',
)
await check(
  `[...document.querySelectorAll('button')].some(x=>x.textContent.trim()==='Sair do projeto')`,
  'member pode sair',
)
await reset('admin')
await check(
  `!!document.querySelector('form') && ![...document.querySelectorAll('button')].some(x=>x.textContent.trim()==='Excluir projeto')`,
  'admin edita mas não exclui',
)
await run(`settingsTest.status=400;document.querySelector('form').requestSubmit()`)
await wait(`document.body.textContent.includes('Nome inválido.')`)
await check(
  `!!document.querySelector('#settings-project-name[aria-invalid=true]')`,
  '400 associa erro ao campo',
)
await reset('owner')
await run(`settingsTest.status=403;document.querySelector('form').requestSubmit()`)
await wait(`document.body.textContent.includes('Projeto indisponível')`)
await check(`!document.querySelector('form')`, '403 revalida e remove controles')
await reset('admin')
await run(
  `settingsTest.role='member';settingsTest.onlyWrite=true;settingsTest.status=403;document.querySelector('form').requestSubmit()`,
)
await wait(`!!document.querySelector('#project-information') && !document.querySelector('form')`)
await check(
  `document.body.textContent.includes('Você não tem permissão')`,
  'perda de papel revalida role pelo GET',
)
await reset('owner')
await run(`settingsTest.status='network';document.querySelector('form').requestSubmit()`)
await wait(`document.body.textContent.includes('Não foi possível conectar')`)
await check(
  `settingsRouter.currentRoute.value.name==='project-settings' && !!document.querySelector('form')`,
  'rede mantém tela e permite tentar novamente',
)
await reset('owner')
await run(`settingsTest.status=401;document.querySelector('form').requestSubmit()`)
await wait(`document.body.textContent.includes('Sua sessão expirou')`)
await check(`!document.querySelector('form')`, '401 remove controles após revalidação')
await reset('member')
await click('Sair do projeto')
await wait(`!!document.querySelector('dialog[open]')`)
await run(`settingsTest.status=404`)
await run(`document.querySelector('dialog .confirm__danger').click()`)
await wait(`document.body.textContent.includes('Projeto indisponível')`)
await check(
  `settingsRouter.currentRoute.value.name==='project-settings'`,
  'saída 404 não redireciona nem finge sucesso',
)
await reset('member')
await click('Sair do projeto')
await wait(`!!document.querySelector('dialog[open]')`)
await run(
  `document.querySelector('dialog .confirm__danger').click();document.querySelector('dialog .confirm__danger').click()`,
)
await wait(`settingsRouter.currentRoute.value.name==='projects'`)
await check(
  `!document.querySelector('#app-sidebar').textContent.includes('Projeto atualizado')`,
  'saída 204 limpa sidebar',
)
await reset('owner')
await run(
  `settingsTest.delay=400;settingsTest.project.name='Resposta antiga';settingsRouter.push('/projects/8/settings')`,
)
await sleep(80)
await run(
  `settingsTest.delay=0;settingsTest.project.name='Projeto atual';settingsRouter.push('/projects/9/settings')`,
)
await sleep(650)
await check(
  `document.querySelector('#settings-project-name').value==='Projeto atual'`,
  'respostas atrasadas não sobrescrevem outro projeto',
)
await run(
  `settingsTest.project.name='Horta comunitária';settingsTest.project.description='Planejamento da horta e das atividades da equipe.'`,
)
await reset('owner')
await run(`document.querySelector('vite-plugin-vue-devtools')?.remove()`)
await sleep(300)
await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }).then((r) =>
  writeFile('docs/issue-45/desktop-light.png', Buffer.from(r.data, 'base64')),
)
await cmd('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
})
await run(`document.querySelector('.layout__header .theme-toggle').click()`)
await sleep(350)
await check(`document.documentElement.scrollWidth<=390`, 'mobile sem overflow horizontal')
await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }).then((r) =>
  writeFile('docs/issue-45/mobile-dark.png', Buffer.from(r.data, 'base64')),
)
await click('Excluir projeto')
await wait(`!!document.querySelector('dialog[open]')`)
await check(
  `document.querySelector('dialog').contains(document.activeElement)`,
  'confirmação recebe foco do teclado',
)
await cmd('Input.dispatchKeyEvent', {
  type: 'keyDown',
  key: 'Escape',
  code: 'Escape',
  windowsVirtualKeyCode: 27,
})
await cmd('Input.dispatchKeyEvent', {
  type: 'keyUp',
  key: 'Escape',
  code: 'Escape',
  windowsVirtualKeyCode: 27,
})
await wait(`!document.querySelector('dialog[open]')`)
await check(
  `document.activeElement.textContent.trim()==='Excluir projeto'`,
  'Escape cancela e devolve foco',
)
await click('Excluir projeto')
await wait(`!!document.querySelector('dialog[open]')`)
await run(
  `document.querySelector('dialog .confirm__danger').click();document.querySelector('dialog .confirm__danger').click()`,
)
await wait(`settingsRouter.currentRoute.value.name==='projects'`)
await check(
  `settingsTest.calls.filter(x=>x.method==='delete').length===1`,
  'DELETE só após confirmação e sem duplicação',
)
await run(`settingsRouter.push('/settings')`)
await wait(`document.body.textContent.includes('Configurações pessoais')`)
await check(
  `!!document.querySelector('a[href="/profile"]') && !!document.querySelector('.settings .theme-toggle')`,
  'configurações pessoais com atalhos reais',
)
await click('Sair da conta')
await wait(`settingsRouter.currentRoute.value.name==='login'`)
await check(
  `(async () => { const tokens = await import('/src/utils/token.js'); return tokens.getAccessToken() === null && tokens.getRefreshToken() === null })()`,
  'logout pessoal redireciona e limpa tokens',
)
ws.close()
