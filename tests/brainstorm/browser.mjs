// Opt-in: teste real do Brainstorm com backend (banco de teste) + Vite + Chrome headless via CDP.
// Uso: FLUXO_TEST_API=http://127.0.0.1:8001/api/ FLUXO_TEST_FRONTEND=http://127.0.0.1:5199 \n//   node tests/brainstorm/browser.mjs <pasta-de-saída>   (Vite com VITE_API_URL apontando para a mesma API)
// A etapa da síntese usa a IA real do backend (AI_API_KEY). Não imprime tokens nem senhas.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { Buffer } from 'node:buffer'

const API = process.env.FLUXO_TEST_API || 'http://127.0.0.1:8001/api/'
const APP = process.env.FLUXO_TEST_FRONTEND || 'http://127.0.0.1:5199'
const OUT = process.argv[2] || 'brainstorm-browser-output'
const SHOTS = `${OUT}/shots`
await mkdir(SHOTS, { recursive: true })
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const log = (...args) => console.log('•', ...args)
const stamp = Date.now()

async function api(path, { token, method = 'GET', body, status } = {}) {
  const response = await fetch(new URL(path, API), {
    method,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(body && { 'Content-Type': 'application/json' }),
    },
    ...(body && { body: JSON.stringify(body) }),
  })
  if (status) assert.equal(response.status, status, `${method} ${path} → ${response.status}`)
  const text = await response.text()
  return { status: response.status, data: text ? JSON.parse(text) : null }
}

// ---------- Dados ----------
const password = 'Girassol-Azul-9384!'
const people = {}
for (const [key, name] of [
  ['ana', 'Ana Dona'],
  ['bruno', 'Bruno Membro'],
  ['carla', 'Carla Externa'],
]) {
  const email = `bs-${stamp}-${key}@example.test`
  await api('register/', { method: 'POST', body: { name, email, password }, status: 201 })
  const { data } = await api('token/', { method: 'POST', body: { email, password }, status: 200 })
  people[key] = { email, name, ...data }
}
const project = (
  await api('projects/', {
    token: people.ana.access,
    method: 'POST',
    body: { name: 'Feira de Ciências' },
    status: 201,
  })
).data
await api('projects/', {
  token: people.carla.access,
  method: 'POST',
  body: { name: 'Projeto da Carla' },
  status: 201,
})
const [found] = (
  await api(
    `invites/find_user/?project=${project.id}&email=${encodeURIComponent(people.bruno.email)}`,
    { token: people.ana.access },
  )
).data
const invite = (
  await api('invites/', {
    token: people.ana.access,
    method: 'POST',
    body: { project: project.id, kind: 'direct', role: 'member', invited_user: found.id },
    status: 201,
  })
).data
await api(`invites/${invite.id}/accept/`, {
  token: people.bruno.access,
  method: 'POST',
  status: 200,
})
const columns = (await api(`columns/?project=${project.id}`, { token: people.ana.access })).data
  .results
const existingTask = (
  await api('tasks/', {
    token: people.ana.access,
    method: 'POST',
    body: {
      project: project.id,
      column: columns[0].id,
      title: 'Comprar materiais para o protótipo',
    },
    status: 201,
  })
).data
log('dados prontos: projeto', project.id)

// ---------- Navegador ----------
const children = []
async function openBrowser(port, person, { width = 1366, height = 900, dark = false } = {}) {
  const child = spawn(
    process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${OUT}/profile-${port}-${stamp}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  )
  children.push(child)
  let target
  for (let i = 0; i < 100 && !target; i++) {
    try {
      target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(
        (p) => p.type === 'page',
      )
    } catch {
      /* subindo */
    }
    if (!target) await pause(150)
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }))
  let id = 0
  const waiting = new Map()
  const consoleErrors = []
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id && waiting.has(message.id)) {
      waiting.get(message.id)(message)
      waiting.delete(message.id)
    }
    if (message.method === 'Runtime.exceptionThrown')
      consoleErrors.push(message.params.exceptionDetails.text)
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error')
      consoleErrors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(' '))
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const current = ++id
      waiting.set(current, (message) =>
        message.error
          ? reject(new Error(`${method}: ${message.error.message}`))
          : resolve(message.result),
      )
      ws.send(JSON.stringify({ id: current, method, params }))
    })
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 700,
  })
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (result.exceptionDetails)
      throw new Error(result.exceptionDetails.exception?.description || 'eval')
    return result.result.value
  }
  const page = {
    consoleErrors,
    evaluate,
    async goto(path) {
      await send('Page.navigate', { url: APP + path })
      await pause(400)
    },
    async waitFor(expression, label, timeout = 15000) {
      const end = Date.now() + timeout
      while (Date.now() < end) {
        if (
          await evaluate(
            `(() => { try { return Boolean(${expression}) } catch { return false } })()`,
          )
        )
          return
        await pause(150)
      }
      await page.shot(`FALHA-${label.replace(/\W+/g, '-')}`)
      throw new Error(`não apareceu: ${label}`)
    },
    hasText: (text) => evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`),
    async click(text, selector = 'button, a, [role=tab]') {
      const ok = await evaluate(`(() => {
        const items = [...document.querySelectorAll(${JSON.stringify(selector)})]
          .filter((el) => el.offsetParent !== null && !el.disabled)
        const el = items.find((el) => el.textContent.trim() === ${JSON.stringify(text)}) ||
          items.find((el) => el.textContent.trim().includes(${JSON.stringify(text)}))
        if (!el) return false
        el.click()
        return true
      })()`)
      assert.ok(ok, `botão/link não encontrado: ${text}`)
      await pause(250)
    },
    async fill(selector, value) {
      const ok = await evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)})
        if (!el) return false
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)})
        el.dispatchEvent(new Event('input', { bubbles: true }))
        return true
      })()`)
      assert.ok(ok, `campo não encontrado: ${selector}`)
    },
    async shot(name) {
      const { data } = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      })
      await writeFile(`${SHOTS}/${name}.png`, Buffer.from(data, 'base64'))
    },
    async login(who) {
      await send('Page.navigate', { url: `${APP}/auth/login` })
      await pause(600)
      await evaluate(`localStorage.setItem('access_token_key', ${JSON.stringify(who.access)});
        localStorage.setItem('refresh_token_key', ${JSON.stringify(who.refresh)});
        localStorage.setItem('fluxo-theme', ${JSON.stringify(dark ? 'dark' : 'light')}); true`)
    },
    close: () => ws.close(),
  }
  await page.login(person)
  return page
}

const results = []
const step = async (name, fn) => {
  try {
    await fn()
    results.push(['OK', name])
    log('OK  ', name)
  } catch (error) {
    results.push(['FALHA', name, error.message])
    log('FALHA', name, '-', error.message)
  }
}

const ana = await openBrowser(9301, people.ana)
const bruno = await openBrowser(9302, people.bruno)
const listPath = `/projects/${project.id}?aba=brainstorm`
let topicPath

await step('lista vazia e acesso pela aba', async () => {
  await ana.goto(listPath)
  await ana.waitFor(`document.body.innerText.includes('Nenhuma discussão ainda')`, 'lista vazia')
  await ana.shot('01-lista-vazia-light')
})

await step('validação do formulário (título obrigatório)', async () => {
  await ana.click('Nova discussão')
  await ana.waitFor(`document.querySelector('dialog[open] textarea')`, 'modal')
  await ana.click('Criar discussão')
  await ana.waitFor(
    `document.body.innerText.includes('Dê um título para a discussão.')`,
    'erro de título',
  )
})

await step('criar discussão e abrir o detalhe', async () => {
  await ana.fill('dialog[open] input[name=title]', 'Qual será o tema da feira?')
  await ana.fill('dialog[open] textarea', 'Precisamos escolher o tema do projeto até sexta.')
  await ana.evaluate(`(() => { const t = document.querySelectorAll('dialog[open] textarea'); const el = t[1];
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,'Robótica');
    el.dispatchEvent(new Event('input',{bubbles:true})); return true })()`)
  await ana.shot('02-nova-discussao')
  await ana.click('Criar discussão')
  await ana.waitFor(`location.pathname.includes('/brainstorm/')`, 'rota do tópico')
  await ana.waitFor(`document.body.innerText.includes('Contexto e objetivo')`, 'detalhe')
  topicPath = await ana.evaluate('location.pathname')
})
const topicId = Number(topicPath?.split('/').pop())

await step('responder (dono)', async () => {
  await ana.fill(
    'textarea[placeholder="Escreva sua resposta…"]',
    'Robótica com sucata: barato e chama atenção.',
  )
  await ana.click('Responder', 'button[type=submit]')
  await ana.waitFor(`document.body.innerText.includes('Robótica com sucata')`, 'resposta publicada')
  assert.equal(
    await ana.evaluate(
      `document.querySelector('textarea[placeholder="Escreva sua resposta…"]').value`,
    ),
    '',
  )
})

await step('membro: sem ações de gestão, responde em thread e vota', async () => {
  await bruno.goto(topicPath)
  await bruno.waitFor(`document.body.innerText.includes('Robótica com sucata')`, 'tópico do membro')
  assert.equal(await bruno.hasText('Encerrar debate'), false)
  assert.equal(await bruno.hasText('Arquivar'), false)
  await bruno.click('Responder', '.reply__action')
  await bruno.fill(
    'textarea[placeholder^="Responder a"]',
    'Concordo, e dá para ligar com reciclagem.',
  )
  await bruno.click('Responder', '.reply__card button[type=submit]')
  await bruno.waitFor(
    `document.querySelector('.reply__children') && document.body.innerText.includes('reciclagem')`,
    'thread',
  )
  // Duplo clique no +1: uma requisição só (o botão trava enquanto envia).
  await bruno.evaluate(
    `(() => { const b = document.querySelector('.reply__card .vote__button'); b.click(); b.click(); return true })()`,
  )
  await pause(1200)
  await bruno.shot('03-discussao-membro')
  assert.equal(await bruno.hasText('editada'), false, 'editada sem edição')
})

await step('voto único registrado no servidor', async () => {
  const replies = (
    await api(`brainstorm-replies/?topic=${topicId}`, { token: people.bruno.access })
  ).data.results
  const first = replies.find((reply) => reply.parent === null)
  assert.deepEqual([first.upvotes, first.my_vote], [1, 1])
})

await step('outro projeto: externo vê "não encontrada"', async () => {
  const carla = await openBrowser(9303, people.carla)
  await carla.goto(topicPath)
  await carla.waitFor(`document.body.innerText.includes('Discussão não encontrada')`, '404 externo')
  await carla.shot('04-externo-404')
  carla.close()
})

await step('dono encerra: discussão somente leitura', async () => {
  await ana.goto(topicPath)
  await ana.waitFor(`document.body.innerText.includes('reciclagem')`, 'recarregar')
  await ana.click('Encerrar debate')
  await ana.waitFor(`document.querySelector('dialog[open]')`, 'confirmação')
  await ana.click('Encerrar debate', 'dialog[open] button')
  await ana.waitFor(
    `document.body.innerText.includes('Encerrada · aguardando decisão')`,
    'badge encerrada',
  )
  assert.equal(
    await ana.evaluate(
      `Boolean(document.querySelector('textarea[placeholder="Escreva sua resposta…"]'))`,
    ),
    false,
  )
  assert.ok(await ana.hasText('Debate encerrado: respostas e votos estão fechados'))
  assert.ok(
    await ana.evaluate(`[...document.querySelectorAll('.vote__button')].every((b) => b.disabled)`),
  )
})

await step('síntese da IA (real, modelo gratuito)', async () => {
  await ana.click('Síntese da IA', '[role=tab]')
  await ana.waitFor(`document.body.innerText.includes('Gerar síntese com IA')`, 'botão gerar')
  await ana.click('Gerar síntese com IA')
  await ana.waitFor(`document.body.innerText.includes('Gerando a síntese')`, 'estado gerando', 5000)
  await ana.shot('05-sintese-gerando')
  await ana.waitFor(
    `document.body.innerText.includes('Proposta principal') || document.querySelector('.analysis__state--error')`,
    'síntese pronta ou falha',
    240000,
  )
  await ana.shot('06-sintese')
  assert.ok(
    await ana.hasText('Proposta principal'),
    'a síntese falhou: ' +
      (await ana.evaluate(`document.querySelector('.analysis__state--error')?.innerText || ''`)),
  )
})

await step('fonte #R leva até a resposta', async () => {
  const has = await ana.evaluate(`Boolean(document.querySelector('.analysis__source'))`)
  if (!has) return log('     (IA não citou fontes nesta execução)')
  await ana.evaluate(`document.querySelector('.analysis__source').click(); true`)
  await ana.waitFor(`document.querySelector('.reply--highlight')`, 'destaque da fonte')
})

let approvedTasks = 0
let createdTasks = 0
await step('decisão: marcar 1 card, revisar e aprovar', async () => {
  await ana.click('Decisão', '[role=tab]')
  await ana.waitFor(`document.body.innerText.includes('Revisar e aprovar a decisão')`, 'editor')
  const cards = await ana.evaluate(`document.querySelectorAll('.task-card').length`)
  if (cards) {
    await ana.evaluate(
      `(() => { const c = document.querySelector('.task-card__check'); c.click(); return true })()`,
    )
    await pause(300)
    // Card 1 sempre como tarefa nova (a IA pode ter apontado uma existente).
    await ana.evaluate(
      `[...document.querySelectorAll('.task-card')][0].querySelector('.task-card__mode').click(); true`,
    )
    await pause(200)
    approvedTasks = 1
    createdTasks = 1
  }
  if (cards > 1) {
    // Card 2: vincular à tarefa existente do Kanban (sem criar duplicata).
    await ana.evaluate(`[...document.querySelectorAll('.task-card__check')][1].click(); true`)
    await pause(300)
    const linkButton = `[...document.querySelectorAll('.task-card')][1].querySelectorAll('.task-card__mode')[1]`
    assert.equal(
      await ana.evaluate(`${linkButton}.disabled`),
      false,
      'Vincular existente desabilitado',
    )
    await ana.evaluate(`${linkButton}.click(); true`)
    await pause(300)
    await ana.evaluate(
      `[...document.querySelectorAll('.task-card')][1].querySelector('button[aria-haspopup]').click(); true`,
    )
    await pause(300)
    await ana.click('Comprar materiais para o protótipo', '[role=option]')
    approvedTasks = 2
  }
  await ana.shot('07-decisao-editor')
  await ana.click('Revisar e aprovar', 'button[type=submit]')
  await ana.waitFor(`document.querySelector('dialog[open]')`, 'confirmação da decisão')
  await ana.shot('08-decisao-confirmar')
  await ana.click('Aprovar decisão', 'dialog[open] button')
  await ana.waitFor(`document.body.innerText.includes('Decisão vigente')`, 'decisão vigente', 20000)
  await ana.shot('09-decisao-vigente')
})

await step('links da decisão abrem a tarefa no Kanban', async () => {
  const hrefs = await ana.evaluate(
    `[...document.querySelectorAll('.decision__task-link')].map((a) => a.getAttribute('href'))`,
  )
  assert.equal(hrefs.length, approvedTasks)
  for (const href of hrefs)
    assert.match(href, new RegExp(`/projects/${project.id}/kanban\\?task=\\d+`))
})

await step('reenvio da aprovação não duplica tarefas', async () => {
  const before = (await api(`tasks/?project=${project.id}`, { token: people.ana.access })).data
    .count
  const analysis = (
    await api(`brainstorm-topics/${topicId}/analysis/`, { token: people.ana.access })
  ).data
  const again = await api(`brainstorm-topics/${topicId}/approve/`, {
    token: people.ana.access,
    method: 'POST',
    body: { analysis: analysis.id, text: 'x', tasks: [] },
  })
  const after = (await api(`tasks/?project=${project.id}`, { token: people.ana.access })).data.count
  assert.deepEqual([again.status, before, after], [200, 1 + createdTasks, 1 + createdTasks])
})

await step('reabrir: "Em revisão" e decisão anterior visível', async () => {
  await ana.click('Reabrir')
  await ana.waitFor(`document.body.innerText.includes('Em revisão')`, 'em revisão')
  await ana.click('Decisão', '[role=tab]')
  await ana.waitFor(
    `document.body.innerText.includes('continua valendo até a aprovação da nova versão')`,
    'vigente em revisão',
  )
  await ana.shot('10-em-revisao')
})

await step('lista: card, filtros na URL, mobile e escuro', async () => {
  await ana.goto(`${listPath}&ordem=-score`)
  await ana.waitFor(`document.querySelector('.topic-card')`, 'card na lista')
  assert.ok(
    await ana.hasText('Precisamos escolher o tema do projeto até sexta.'),
    'prévia do contexto',
  )
  assert.ok(await ana.hasText('Em revisão'))
  await ana.shot('11-lista-light')
  await ana.goto(`${listPath}&status=archived`)
  await ana.waitFor(
    `document.body.innerText.includes('Nenhuma discussão encontrada com esses filtros')`,
    'filtro arquivadas',
  )
  const dark = await openBrowser(9304, people.ana, { dark: true })
  await dark.goto(listPath)
  await dark.waitFor(`document.querySelector('.topic-card')`, 'lista escura')
  await dark.shot('12-lista-dark')
  await dark.goto(topicPath)
  await dark.waitFor(`document.body.innerText.includes('Contexto e objetivo')`, 'detalhe escuro')
  await dark.shot('13-discussao-dark')
  dark.close()
  const mobile = await openBrowser(9305, people.bruno, { width: 390, height: 844 })
  await mobile.goto(listPath)
  await mobile.waitFor(`document.querySelector('.topic-card')`, 'lista mobile')
  await mobile.shot('14-lista-mobile')
  assert.ok(
    await mobile.evaluate(`document.documentElement.scrollWidth <= window.innerWidth + 1`),
    'rolagem horizontal no mobile',
  )
  await mobile.goto(topicPath)
  await mobile.waitFor(`document.body.innerText.includes('reciclagem')`, 'detalhe mobile')
  await mobile.shot('15-discussao-mobile')
  assert.ok(
    await mobile.evaluate(`document.documentElement.scrollWidth <= window.innerWidth + 1`),
    'rolagem horizontal no detalhe mobile',
  )
  mobile.close()
})

await step('visão geral mostra contagem real', async () => {
  await ana.goto(`/projects/${project.id}`)
  await ana.waitFor(`document.body.innerText.includes('1 discussão aberta')`, 'atalho com contagem')
})

await step('arquivar: somente leitura definitivo', async () => {
  await ana.goto(topicPath)
  await ana.waitFor(`document.body.innerText.includes('Contexto e objetivo')`, 'detalhe')
  await ana.click('Arquivar')
  await ana.click('Arquivar', 'dialog[open] button')
  await ana.waitFor(
    `document.body.innerText.includes('Discussão arquivada: o histórico fica preservado')`,
    'arquivada',
  )
  assert.equal(await ana.hasText('Reabrir'), false)
  await ana.shot('16-arquivada')
})

await step('sem erros de JavaScript no console', async () => {
  const errors = [...ana.consoleErrors, ...bruno.consoleErrors].filter(
    (text) => !/401|404|Failed to load resource/.test(text),
  )
  assert.deepEqual(errors, [])
})

ana.close()
bruno.close()
for (const child of children) child.kill()
await writeFile(`${OUT}/results.json`, JSON.stringify(results, null, 2))
const failed = results.filter(([state]) => state === 'FALHA')
console.log(`\n${results.length - failed.length}/${results.length} passos OK`)
process.exit(failed.length ? 1 : 0)
