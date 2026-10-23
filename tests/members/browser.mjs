// Backend real; execute real-api.mjs antes. Sessões e tokens ficam somente em /tmp.
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import process from 'node:process'
const origin = process.env.FLUXO_TEST_FRONTEND || 'http://127.0.0.1:5181'
const sessions = JSON.parse(await readFile('/tmp/fluxo27-sessions.json', 'utf8'))
const screenshotDir = process.env.FLUXO_TEST_SCREENSHOTS || '/tmp/fluxo27-screenshots'
await mkdir(screenshotDir, { recursive: true })
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const browsers = []
async function openBrowser(port) {
  const child = spawn(
    'google-chrome',
    [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=/tmp/fluxo27-browser-${port}-${Date.now()}`,
    ],
    { stdio: 'ignore' },
  )
  const browser = { child }
  browsers.push(browser)
  let pages
  for (let i = 0; i < 100; i++) {
    try {
      pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      if (pages.some((p) => p.type === 'page')) break
    } catch {
      /* starting */
    }
    await pause(100)
  }
  const ws = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl)
  browser.ws = ws
  await new Promise((resolve) => (ws.onopen = resolve))
  let id = 0
  const pending = new Map(),
    errors = []
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data)
    if (message.id) {
      pending.get(message.id)?.(message)
      pending.delete(message.id)
    } else if (message.method === 'Runtime.exceptionThrown')
      errors.push(message.params.exceptionDetails.text)
  }
  async function call(method, params = {}) {
    const result = await new Promise((resolve) => {
      pending.set(++id, resolve)
      ws.send(JSON.stringify({ id, method, params }))
    })
    if (result.error) throw new Error(`${method}: ${result.error.message}`)
    return result.result
  }
  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (result.exceptionDetails) throw new Error('Falha ao executar ação no navegador')
    return result.result?.value
  }
  async function wait(expression, description = 'estado esperado') {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(expression)) return
      await pause(150)
    }
    await screenshot('failure')
    const diagnostic = await evaluate(
      '({ title: document.title, text: document.body.innerText.slice(0,500), scripts: document.scripts.length })',
    )
    console.error(diagnostic, errors)
    throw new Error(`Tempo esgotado: ${description}`)
  }
  async function go(path) {
    await call('Page.navigate', { url: origin + path })
    await wait('document.readyState === "complete"')
  }
  async function fill(selector, value) {
    await evaluate(
      `(()=>{ const el=document.querySelector(${JSON.stringify(selector)}); el.value=${JSON.stringify(value)}; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); })()`,
    )
  }
  async function click(text, selector = 'button') {
    await evaluate(
      `(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(el=>el.textContent.trim()===${JSON.stringify(text)}); if(!el || el.disabled) throw new Error('Ação indisponível'); el.click()})()`,
    )
  }
  async function login(name, redirect = '') {
    await go('/auth/login' + (redirect ? '?redirect=' + encodeURIComponent(redirect) : ''))
    await wait('!!document.querySelector("input[name=email]")')
    await fill('input[name=email]', sessions.accounts[name].email)
    await fill('input[name=password]', sessions.accounts[name].password)
    await evaluate('document.querySelector("form").requestSubmit()')
    await wait('!location.pathname.startsWith("/auth/")', 'login')
  }
  async function screenshot(name) {
    await evaluate(
      'document.querySelectorAll(".copy-field input, dialog input[readonly]").forEach(el=>el.style.visibility="hidden")',
    )
    const capture = await call('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    })
    await writeFile(`${screenshotDir}/${name}.png`, Buffer.from(capture.data, 'base64'))
    await evaluate(
      'document.querySelectorAll(".copy-field input, dialog input[readonly]").forEach(el=>el.style.visibility="")',
    )
  }
  await call('Page.enable')
  await call('Runtime.enable')
  await call('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  return { call, evaluate, wait, go, fill, click, login, screenshot, errors }
}
try {
  const owner = await openBrowser(9231)
  await owner.login('owner')
  await owner.go(`/projects/${sessions.project.id}`)
  await owner.wait('!!document.querySelector(".participants a")', 'atalho do projeto')
  await owner.evaluate('document.querySelector(".participants a").click()')
  await owner.wait('document.querySelectorAll(".member-list tbody tr").length === 3', 'lista real')
  await owner.fill('input[type=search]', 'member')
  await owner.wait('document.querySelectorAll(".member-list tbody tr").length === 1', 'busca local')
  await owner.fill('input[type=search]', '')
  await owner.screenshot('participants-desktop-light')
  await owner.click('Convidar membro')
  await owner.wait('!!document.querySelector("dialog[open]")')
  await owner.fill('input[name=invite-email]', sessions.accounts.other.email)
  await owner.click('Buscar pessoa')
  await owner.wait('!!document.querySelector(".recipient")', 'e-mail exato')
  await owner.screenshot('invite-desktop-light')
  await owner.evaluate('document.querySelector(".recipient input").click()')
  await owner.click('Enviar convite direto')
  await owner.wait(
    'document.querySelector("dialog").innerText.includes("Convite disponível dentro do Fluxo")',
    'convite direto criado',
  )
  await owner.evaluate('document.querySelector("dialog button[aria-label=Fechar]").click()')
  await owner.wait('!document.querySelector("dialog")')
  assert.equal(
    await owner.evaluate('document.activeElement.textContent.includes("Convidar membro")'),
    true,
  )
  await owner.click('Convidar membro')
  await owner.click('Gerar novo link')
  await owner.wait('!!document.querySelector("dialog input[readonly]")', 'link gerado')
  const sharedLink = await owner.evaluate('document.querySelector("dialog input[readonly]").value')
  await owner.call('Browser.grantPermissions', {
    origin,
    permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
  })
  await owner.call('Page.bringToFront')
  await owner.click('Copiar link')
  await owner.wait(
    'document.querySelector("dialog").innerText.includes("Link copiado")',
    'cópia real',
  )
  assert.equal(await owner.evaluate('navigator.clipboard.readText()'), sharedLink)
  await owner.evaluate('document.querySelector("dialog button[aria-label=Fechar]").click()')
  const guest = await openBrowser(9232)
  const linkPath = new URL(sharedLink).pathname
  await guest.go(linkPath)
  await guest.wait('!!document.querySelector(".redeem-card")')
  await guest.click('Criar conta', 'a')
  await guest.wait('location.pathname.endsWith("register")')
  assert.equal(
    await guest.evaluate('new URLSearchParams(location.search).get("redirect")'),
    linkPath,
  )
  await guest.fill('input[name=name]', 'Nova Pessoa Teste')
  await guest.fill('input[name=email]', `team27-browser-${Date.now()}@example.test`)
  await guest.fill('input[name=password]', 'Fluxo-browser-test-Q!9271')
  await guest.fill('input[name=passwordConfirm]', 'Fluxo-browser-test-Q!9271')
  await guest.evaluate('document.querySelector("form").requestSubmit()')
  await guest.wait('location.pathname.startsWith("/invite/")', 'cadastro retoma link')
  await guest.click('Entrar no projeto')
  await guest.wait('location.pathname.startsWith("/projects/")', 'resgate')
  await guest.wait('document.body.innerText.includes("Feira de Ciências")')
  const received = await openBrowser(9233)
  await received.login('visitor')
  await received.wait(
    'document.querySelector(".received-invites")?.innerText.includes("Feira de Ciências")',
    'convite recebido',
  )
  await received.click('Aceitar')
  await received.wait(
    'document.querySelector(".received-invites")?.innerText.includes("Convite aceito")',
  )
  await received.click('Abrir projeto aceito', 'a')
  await received.wait('location.pathname.startsWith("/projects/")')
  await owner.call('Page.reload')
  await owner.wait(
    'document.querySelectorAll(".member-list tbody tr").length === 5',
    'persistência F5',
  )
  async function memberAction(name, action) {
    await owner.evaluate(
      `(()=>{const row=[...document.querySelectorAll('.member-list tbody tr')].find(row=>row.innerText.includes(${JSON.stringify(name)})); row.querySelector('summary').click(); [...row.querySelectorAll('button')].find(el=>el.textContent.trim()===${JSON.stringify(action)}).click()})()`,
    )
    await owner.wait('!!document.querySelector("dialog[open]")')
    await owner.click('Confirmar')
    await owner.wait(
      '!document.querySelector("dialog") && !document.querySelector(".error[role=alert]")',
      'mutação de participante',
    )
    await pause(400)
  }
  await memberAction('Teste visitor', 'Tornar administrador')
  await owner.wait(
    '[...document.querySelectorAll(".member-list tbody tr")].some(row=>row.innerText.includes("Teste visitor") && row.innerText.includes("Administrador"))',
  )
  await memberAction('Teste visitor', 'Tornar membro')
  await memberAction('Teste visitor', 'Remover participante')
  await owner.wait('document.querySelectorAll(".member-list tbody tr").length === 4')
  console.log(
    'PASS navegador: convite direto, copiar link, cadastro/retorno, resgate, recebidos/aceite, F5, papéis e remoção',
  )
  // Recusa com outra conta, sem depender do acesso interno ao projeto.
  await received.login('other')
  await received.wait(
    'document.querySelector(".received-invites")?.innerText.includes("Feira de Ciências")',
  )
  await received.click('Recusar')
  await received.wait(
    'document.querySelector(".received-invites")?.innerText.includes("Convite recusado")',
  )
  // Login também retoma o link, que continua utilizável após o primeiro resgate.
  await received.login('visitor', linkPath)
  await received.wait('location.pathname.startsWith("/invite/")')
  await received.click('Entrar no projeto')
  await received.wait('location.pathname.startsWith("/projects/")')
  await owner.call('Page.reload')
  await owner.wait('document.querySelectorAll(".member-list tbody tr").length === 5')
  // Revogação pela interface.
  await owner.evaluate(
    '[...document.querySelectorAll(".invites li")].find(row=>row.innerText.includes("Link compartilhável")).querySelector("button:last-child").click()',
  )
  await owner.wait('!!document.querySelector("dialog")')
  await owner.click('Confirmar')
  await owner.wait('document.querySelector(".invites").innerText.includes("Revogado")')
  await owner.evaluate('document.documentElement.dataset.theme="dark"')
  await owner.screenshot('participants-desktop-dark')
  await owner.call('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await owner.screenshot('participants-mobile-dark')
  assert.equal(await owner.evaluate('document.documentElement.scrollWidth <= innerWidth'), true)
  await owner.click('Convidar membro')
  await owner.screenshot('invite-mobile-dark')
  assert.equal(
    await owner.evaluate(
      'document.querySelector("dialog").getBoundingClientRect().width <= innerWidth',
    ),
    true,
  )
  await owner.call('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  })
  await owner.call('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  })
  await owner.wait('!document.querySelector("dialog")', 'Escape')
  await owner.evaluate('document.documentElement.dataset.theme="light"')
  await owner.screenshot('participants-mobile-light')
  await owner.call('Network.enable')
  await owner.call('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  })
  await owner.wait('document.body.innerText.includes("Você está offline")')
  assert.equal(
    await owner.evaluate(
      '[...document.querySelectorAll("button")].find(el=>el.innerText.includes("Convidar membro")).disabled',
    ),
    true,
  )
  await owner.call('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  })
  await owner.wait('!document.body.innerText.includes("Você está offline")')
  await pause(500)
  await memberAction('Teste member', 'Transferir propriedade')
  await owner.wait(
    '[...document.querySelectorAll(".member-list tbody tr")].some(row=>row.innerText.includes("Teste member") && row.innerText.includes("Dono"))',
  )
  await owner.click('Convidar membro')
  assert.equal(
    await owner.evaluate('!!document.querySelector("#invite-role option[value=admin]")'),
    false,
  )
  await owner.evaluate('document.querySelector("dialog button[aria-label=Fechar]").click()')
  await owner.go('/projects/99999999/members')
  await owner.wait('!!document.querySelector(".notice[role=alert]")')
  for (const browser of [owner, guest, received]) assert.deepEqual(browser.errors, [])
  console.log(
    'PASS navegador: recusa, login retoma link reutilizável, revogação, Light/Dark, mobile, Escape, foco, offline, transferência e 404',
  )
} finally {
  for (const browser of browsers) {
    browser.ws?.close()
    browser.child.kill()
  }
}
