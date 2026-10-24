// Backend real; execute real-api.mjs antes. Sessões e tokens ficam somente em /tmp.
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import process from 'node:process'
const origin = process.env.FLUXO_TEST_FRONTEND || 'http://127.0.0.1:5143'
const sessions = JSON.parse(await readFile('/tmp/fluxo47-recent-sessions.json', 'utf8'))
const screenshotDir = process.env.FLUXO_TEST_SCREENSHOTS || '/tmp/fluxo47-recent-screenshots'
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
      `--user-data-dir=/tmp/fluxo43-browser-${port}-${Date.now()}`,
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
      errors.push(
        message.params.exceptionDetails.exception?.description ||
          message.params.exceptionDetails.text,
      )
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
    if (result.exceptionDetails)
      throw new Error(
        result.exceptionDetails.exception?.description || 'Falha ao executar ação no navegador',
      )
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
      `(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(el=>el.textContent.trim()===${JSON.stringify(text)}); if(!el || el.disabled) throw new Error('Ação indisponível'); el.focus(); el.click()})()`,
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
  const browser = await openBrowser(9347)
  await browser.login('owner')
  await browser.go(`/projects/${sessions.project.id}?aba=atividades`)
  await browser.wait('document.querySelectorAll(".timeline li").length === 20', 'registros reais')
  assert.equal(
    await browser.evaluate(
      'document.querySelector(".activities").innerText.includes("Não inclui alterações")',
    ),
    true,
  )
  await browser.screenshot('recent-records-desktop-light')
  await browser.click('Mostrar mais registros')
  await browser.wait('document.querySelectorAll(".timeline li").length === 22', 'paginação local')
  await browser.click('Todos os registros')
  await browser.wait('!!document.querySelector("[role=listbox]")')
  await browser.evaluate(
    '[...document.querySelectorAll("[role=option]")].find(el=>el.textContent.includes("Tarefas")).click()',
  )
  await browser.wait(
    'document.querySelectorAll(".timeline li").length === 1',
    'filtro coleção completa',
  )
  assert.equal(
    await browser.evaluate(
      'document.querySelector(".timeline").innerText.includes("Preparar apresentação revisada")',
    ),
    true,
  )
  await browser.click('Abrir tarefa', 'a')
  await browser.wait(
    'location.pathname.includes("kanban") && new URLSearchParams(location.search).has("task")',
    'link da tarefa real',
  )
  await browser.go(`/projects/${sessions.other.id}?aba=atividades`)
  await browser.wait(
    'document.querySelectorAll(".timeline li").length === 1',
    'outro projeto só com o dono',
  )
  assert.equal(
    await browser.evaluate(
      'document.querySelector(".activities").innerText.includes("Documento-")',
    ),
    false,
  )
  await browser.go(`/projects/${sessions.project.id}?aba=atividades`)
  await browser.wait('document.querySelectorAll(".timeline li").length === 20')
  await browser.call('Page.reload')
  await pause(700)
  await browser.wait('document.querySelectorAll(".timeline li").length === 20', 'F5')
  await browser.evaluate('document.documentElement.dataset.theme="dark"')
  await browser.screenshot('recent-records-desktop-dark')
  await browser.call('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await browser.screenshot('recent-records-mobile-dark')
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth <= innerWidth'), true)
  await browser.evaluate('document.documentElement.dataset.theme="light"')
  await browser.screenshot('recent-records-mobile-light')
  assert.deepEqual(browser.errors, [])
  console.log(
    'PASS navegador com backend real: resumo de registros atuais, filtros completos, mostrar mais, link da tarefa, troca de projeto, F5, mobile e Light/Dark.',
  )
} finally {
  for (const browser of browsers) {
    browser.ws?.close()
    browser.child.kill()
  }
}
