// UI real do frontend com respostas HTTP de teste. Não acessa contas/banco reais.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { Buffer } from 'node:buffer'
const origin = 'http://127.0.0.1:5188'
const output = process.env.FLUXO_TEST_SCREENSHOTS || '/tmp/fluxo48-screenshots'
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const children = []
let ws
const pageErrors = []
try {
  await mkdir(output, { recursive: true })
  const vite = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5188', '--strictPort'],
    { stdio: 'pipe' },
  )
  children.push(vite)
  let viteError = ''
  vite.stdout.on('data', (data) => {
    viteError += data.toString()
  })
  vite.stderr.on('data', (data) => {
    viteError += data.toString()
  })
  let ready = false
  for (let i = 0; i < 50; i++) {
    if (vite.exitCode !== null) throw new Error(`Vite não iniciou: ${viteError}`)
    try {
      if ((await fetch(origin)).ok) {
        ready = true
        break
      }
    } catch {
      /* iniciando */
    }
    await pause(100)
  }
  assert.ok(ready, `Vite indisponível: ${viteError}`)
  const chrome = spawn(
    'google-chrome',
    [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--remote-debugging-port=9338',
      `--user-data-dir=/tmp/fluxo48-browser-${Date.now()}`,
    ],
    { stdio: 'pipe' },
  )
  children.push(chrome)
  let chromeError = ''
  chrome.stderr.on('data', (data) => {
    chromeError += data.toString()
  })
  let pages
  for (let i = 0; i < 50; i++) {
    if (chrome.exitCode !== null || chrome.signalCode)
      throw new Error(`Chrome não iniciou: ${chromeError}`)
    try {
      pages = await (await fetch('http://127.0.0.1:9338/json/list')).json()
      if (pages.some((p) => p.type === 'page')) break
    } catch {
      /* iniciando */
    }
    await pause(100)
  }
  assert.ok(
    pages?.some((p) => p.type === 'page'),
    `Chrome indisponível: ${chromeError}`,
  )
  ws = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })
  let sequence = 0
  const pending = new Map()
  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new Error(`Timeout CDP: ${method}`))
      }, 10000)
      pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer)
          resolve(value)
        },
        reject,
      })
      ws.send(JSON.stringify({ id, method, params }))
    })
  }
  const tasks = Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    project: 1,
    title: `Entrega ${i + 1}`,
    due_date: '2026-10-24',
    column: i === 4 ? 2 : 1,
    assignee: i === 0 ? 7 : null,
    priority: i === 0 ? 'high' : 'medium',
    completed_at: null,
  }))
  tasks.push({
    id: 6,
    project: 1,
    title: 'Concluída',
    due_date: '2026-10-22',
    column: 3,
    assignee: null,
    priority: 'low',
    completed_at: '2026-10-22T12:00:00Z',
  })
  const columns = [
    { id: 1, project: 1, name: 'A fazer', category: 'todo' },
    { id: 2, project: 1, name: 'Em andamento', category: 'in_progress' },
    { id: 3, project: 1, name: 'Concluído', category: 'done' },
  ]
  let failTasks = false
  const writes = []
  ws.onmessage = async (event) => {
    const message = JSON.parse(event.data)
    if (message.id) {
      const listener = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) listener?.reject(new Error(message.error.message))
      else listener?.resolve(message.result)
    } else if (message.method === 'Runtime.exceptionThrown')
      pageErrors.push(message.params.exceptionDetails.text)
    else if (message.method === 'Fetch.requestPaused') {
      const { requestId, request } = message.params
      const path = new URL(request.url).pathname
      if (!['GET', 'OPTIONS'].includes(request.method)) writes.push(request.method)
      let body = { results: [], total_pages: 1 },
        status = 200
      if (path.endsWith('/projects/1/'))
        body = { id: 1, name: 'Projeto de entregas', role: 'owner' }
      else if (path.endsWith('/tasks/')) {
        body = { results: tasks, total_pages: 1 }
        if (failTasks) status = 503
      } else if (path.endsWith('/columns/')) body = { results: columns, total_pages: 1 }
      else if (path.endsWith('/memberships/'))
        body = {
          results: [
            { id: 1, project: 1, user: 7, user_name: 'Clara', user_email: 'clara@example.test' },
          ],
          total_pages: 1,
        }
      else if (path.endsWith('/users/me/'))
        body = { id: 7, name: 'Clara', email: 'clara@example.test', profile_picture: null }
      try {
        await call('Fetch.fulfillRequest', {
          requestId,
          responseCode: status,
          responseHeaders: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Access-Control-Allow-Origin', value: '*' },
            { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' },
            { name: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' },
          ],
          body: Buffer.from(JSON.stringify(body)).toString('base64'),
        })
      } catch (error) {
        pageErrors.push(error.message)
      }
    }
  }
  await call('Page.enable')
  await call('Runtime.enable')
  await call('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/*', requestStage: 'Request' }] })
  const env = await readFile('.env', 'utf8')
  const accessKey = env
    .match(/^VITE_ACCESS_TOKEN_KEY=(.*)$/m)?.[1]
    ?.trim()
    .replace(/^['"]|['"]$/g, '')
  assert.ok(accessKey, 'VITE_ACCESS_TOKEN_KEY necessário no .env')
  const jwt = `e30.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64url')}.test`
  await call('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem(${JSON.stringify(accessKey)},${JSON.stringify(jwt)});`,
  })
  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
    return result.result.value
  }
  async function until(expression) {
    for (let i = 0; i < 80; i++) {
      if (await evaluate(expression)) return
      await pause(100)
    }
    throw new Error(`Condição não atendida: ${expression}`)
  }
  const goto = async (path) => {
    await call('Page.navigate', { url: origin + path })
    await until('!!document.querySelector(".month-table")')
  }
  const screenshot = async (name) => {
    const { data } = await call('Page.captureScreenshot', { captureBeyondViewport: true })
    await writeFile(`${output}/${name}.png`, Buffer.from(data, 'base64'))
  }
  await call('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await goto('/projects/1/calendar?month=2026-10&day=2026-10-24')
  assert.equal(await evaluate('document.querySelectorAll(".day-agenda .calendar-task").length'), 5)
  assert.ok(
    await evaluate(
      'Array.from(document.links).some(link => link.getAttribute("href") === "/projects/1/kanban?task=1")',
    ),
  )
  const google = await evaluate('document.querySelector(".day-agenda .google-calendar-link")?.href')
  assert.equal(new URL(google).searchParams.get('dates'), '20261024/20261025')
  assert.equal(
    await evaluate('document.querySelector(".google-calendar-panel__badge")?.textContent.trim()'),
    'Adição manual',
  )
  await screenshot('desktop-light')
  await evaluate('document.documentElement.dataset.theme="dark"')
  await screenshot('desktop-dark')
  await evaluate(
    'Array.from(document.querySelectorAll("[data-date]")).find(button => button.dataset.date === "2026-10-24").focus()',
  )
  await call('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'ArrowRight',
    code: 'ArrowRight',
    windowsVirtualKeyCode: 39,
  })
  await until('document.activeElement?.dataset.date === "2026-10-25"')
  await goto('/projects/1/calendar?month=2026-12&day=2026-12-31')
  await evaluate(
    'Array.from(document.querySelectorAll("button")).find(b=>b.getAttribute("aria-label")==="Próximo mês").click()',
  )
  await until('document.querySelector(".calendar-page__months h2")?.textContent.includes("2027")')
  await goto('/projects/1/calendar?month=2026-10&day=2026-10-24&assignee=7')
  assert.equal(await evaluate('document.querySelectorAll(".day-agenda .calendar-task").length'), 1)
  await goto('/projects/1/calendar?month=2026-10&day=2026-10-22&column=3')
  assert.equal(
    await evaluate('document.querySelectorAll(".day-agenda .calendar-task__late").length'),
    0,
  )
  await call('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await goto('/projects/1/calendar?month=2026-10&day=2026-10-24')
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'))
  assert.equal(
    await evaluate('getComputedStyle(document.querySelector(".month-table__tasks")).display'),
    'none',
  )
  assert.equal(await evaluate('document.querySelectorAll(".day-agenda .calendar-task").length'), 5)
  await screenshot('mobile-light')
  await evaluate('document.documentElement.dataset.theme="dark"')
  await screenshot('mobile-dark')
  failTasks = true
  await call('Page.navigate', { url: origin + '/projects/1/calendar?month=2026-10' })
  await until('!!document.querySelector(".calendar-page__state[role=alert]")')
  failTasks = false
  await evaluate(
    'Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("Tentar novamente")).click()',
  )
  await until('!!document.querySelector(".month-table")')
  await call('Page.navigate', { url: origin + '/projects/1/kanban' })
  await until('!!document.querySelector(".kanban-page__tabs")')
  await evaluate(
    'Array.from(document.querySelectorAll("button")).find(b=>b.textContent.trim()==="Nova tarefa").click()',
  )
  await until('!!document.querySelector("dialog[open] .date-field__trigger")')
  await evaluate('document.querySelector("dialog[open] .date-field__trigger").click()')
  await until('!!document.querySelector(".date-picker")')
  assert.ok(await evaluate('!!document.querySelector(".date-picker").closest("dialog[open]")'))
  await screenshot('prazo-fluxo-light')
  await evaluate('document.documentElement.dataset.theme="dark"')
  await screenshot('prazo-fluxo-dark')
  await call('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  })
  await until('!document.querySelector(".date-picker")')
  assert.ok(await evaluate('!!document.querySelector("dialog[open] .task-form")'))
  await evaluate('document.querySelector("dialog[open] .date-field__trigger").click()')
  await until('!!document.querySelector(".date-picker")')
  await evaluate(
    'Array.from(document.querySelectorAll(".date-picker__footer button")).find(b=>b.textContent==="Hoje").click()',
  )
  await until('!document.querySelector(".date-picker")')
  assert.ok(await evaluate('!!document.querySelector("input[name=due_date]").value'))
  assert.deepEqual(writes, [])
  assert.deepEqual(pageErrors, [])
  console.log(
    `PASS: desktop/mobile, Light/Dark, teclado, ano, filtros, links, retry, somente leitura. Capturas: ${output}`,
  )
} finally {
  ws?.close()
  for (const child of children.reverse()) child.kill('SIGTERM')
}
