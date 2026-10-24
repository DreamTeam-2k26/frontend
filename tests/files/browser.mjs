// Backend real; execute real-api.mjs antes. Sessões e tokens ficam somente em /tmp.
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import process from 'node:process'
const origin = process.env.FLUXO_TEST_FRONTEND || 'http://127.0.0.1:5143'
const sessions = JSON.parse(await readFile('/tmp/fluxo43-sessions.json', 'utf8'))
const screenshotDir = process.env.FLUXO_TEST_SCREENSHOTS || '/tmp/fluxo43-screenshots'
await mkdir(screenshotDir, { recursive: true })
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const browsers = []
const downloadDir = `/tmp/fluxo43-downloads-${Date.now()}`
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
  // A fixture é de banco isolado. Limpa apenas os arquivos criados por este cenário para repeti-lo.
  const cleanup = await fetch(
    `http://127.0.0.1:8043/api/files/?project=${sessions.project.id}&page_size=100`,
    { headers: { Authorization: `Bearer ${sessions.accounts.member.access}` } },
  )
  assert.equal(cleanup.status, 200)
  for (const file of (await cleanup.json()).results.filter((file) =>
    ['fluxo43-upload.txt', 'Documento revisado.txt'].includes(file.name),
  )) {
    const response = await fetch(`http://127.0.0.1:8043/api/files/${file.id}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${sessions.accounts.member.access}` },
    })
    assert.equal(response.status, 204)
  }
  const browser = await openBrowser(9343)
  await browser.login('member')
  await browser.go(`/projects/${sessions.project.id}?aba=pastas`)
  await browser.wait(
    'document.querySelectorAll(".files-table tbody tr").length === 3',
    'arquivos reais da raiz',
  )
  await browser.screenshot('files-desktop-light')
  await browser.click('Enviar arquivo')
  await browser.wait('!!document.querySelector("dialog[open] input[type=file]")', 'modal de upload')
  await browser.screenshot('upload-desktop-light')
  // Seleção pelo seletor nativo via CDP, sem mock de requisições ou arquivos.
  const doc = await browser.call('DOM.getDocument')
  const node = await browser.call('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: 'dialog input[type=file]',
  })
  await browser.call('DOM.setFileInputFiles', {
    nodeId: node.nodeId,
    files: ['/tmp/fluxo43-upload.txt'],
  })
  await browser.wait(
    'document.querySelector("dialog").innerText.includes("fluxo43-upload.txt")',
    'arquivo selecionado',
  )
  await browser.click('Enviar arquivo', 'dialog button')
  await browser.wait(
    '!document.querySelector("dialog") && document.querySelectorAll(".files-table tbody tr").length === 4',
    'upload concluído',
  )
  await browser.call('Page.reload')
  await pause(700)
  await browser.wait(
    'document.querySelectorAll(".files-table tbody tr").length === 4',
    'persistência após F5',
  )
  async function action(name, label) {
    await browser.evaluate(
      `(()=>{const row=[...document.querySelectorAll('.files-table tbody tr')].find(row=>row.innerText.includes(${JSON.stringify(name)})); row.querySelector('summary').click(); [...row.querySelectorAll('button')].find(el=>el.textContent.trim()===${JSON.stringify(label)}).click()})()`,
    )
  }
  await action('fluxo43-upload.txt', 'Renomear')
  await browser.wait('!!document.querySelector("dialog form input")')
  await browser.fill('dialog form input', 'Documento revisado.txt')
  await browser.click('Salvar nome')
  await browser.wait(
    '!document.querySelector("dialog") && document.querySelector(".files-table").innerText.includes("Documento revisado.txt")',
    'renomeação',
  )
  await browser.call('Browser.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir,
    eventsEnabled: true,
  })
  await action('Documento revisado.txt', 'Baixar')
  await browser.wait(
    'document.querySelector(".project-files").innerText.includes("Download iniciado")',
    'download autenticado',
  )
  let downloaded
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      downloaded = await readFile(`${downloadDir}/Documento revisado.txt`, 'utf8')
      break
    } catch {
      await pause(100)
    }
  }
  assert.equal(downloaded, await readFile('/tmp/fluxo43-upload.txt', 'utf8'))
  await action('Documento revisado.txt', 'Mover')
  await browser.wait('document.querySelectorAll("dialog[open]").length === 2', 'destino')
  await browser.wait(
    '[...document.querySelectorAll(".destinations button")].some(el=>el.textContent.includes("Documentos gerais"))',
    'pastas de destino carregadas',
  )
  await browser.click('Documentos gerais')
  await browser.wait('document.querySelector(".caption")?.innerText.includes("Documentos gerais")')
  await browser.click('Usar este local')
  await browser.click('Mover arquivo')
  await browser.wait(
    '!document.querySelector("dialog") && document.querySelectorAll(".files-table tbody tr").length === 3',
    'movimento para pasta',
  )
  await browser.evaluate(
    `[...document.querySelectorAll('.folder-list a, .folder-card a, a')].find(el=>el.textContent.includes('Documentos gerais')).click()`,
  )
  await browser.wait(
    'document.querySelectorAll(".files-table tbody tr").length === 2',
    'pasta com arquivos',
  )
  assert.equal(
    await browser.evaluate('new URLSearchParams(location.search).get("pasta")'),
    String(sessions.folders[0].id),
  )
  await browser.call('Page.reload')
  await pause(700)
  await browser.wait(
    'document.querySelectorAll(".files-table tbody tr").length === 2',
    'URL direta de pasta após F5',
  )
  await action('Documento revisado.txt', 'Excluir')
  await browser.wait('!!document.querySelector("dialog")')
  assert.equal(
    await browser.evaluate('document.querySelector("dialog").innerText.includes("armazenamento")'),
    true,
  )
  await browser.click('Excluir permanentemente')
  await browser.wait(
    '!document.querySelector("dialog") && document.querySelectorAll(".files-table tbody tr").length === 1',
    'exclusão',
  )
  await browser.evaluate('document.documentElement.dataset.theme="dark"')
  await browser.screenshot('files-desktop-dark')
  await browser.call('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await browser.screenshot('files-mobile-dark')
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth <= innerWidth'), true)
  await browser.click('Enviar arquivo')
  await browser.screenshot('upload-mobile-dark')
  assert.equal(
    await browser.evaluate(
      'document.querySelector("dialog").getBoundingClientRect().width <= innerWidth',
    ),
    true,
  )
  await browser.call('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  })
  await browser.call('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  })
  await browser.wait('!document.querySelector("dialog")', 'Escape')
  assert.equal(
    await browser.evaluate('document.activeElement.textContent.includes("Enviar arquivo")'),
    true,
  )
  await browser.evaluate('document.documentElement.dataset.theme="light"')
  await browser.screenshot('files-mobile-light')
  assert.deepEqual(browser.errors, [])
  console.log(
    'PASS navegador real: login, raiz/pasta, upload nativo, F5, rename, download, move, delete, mobile, Light/Dark, Escape e foco',
  )
} finally {
  for (const browser of browsers) {
    browser.ws?.close()
    browser.child.kill()
  }
}
