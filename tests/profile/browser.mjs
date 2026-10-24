// Backend real; execute real-api.mjs antes. Sessões e tokens ficam somente em /tmp.
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import process from 'node:process'
const origin = process.env.FLUXO_TEST_FRONTEND || 'http://127.0.0.1:5143'
const sessions = JSON.parse(await readFile('/tmp/fluxo43-sessions.json', 'utf8'))
const screenshotDir = process.env.FLUXO_TEST_SCREENSHOTS || '/tmp/fluxo-profile-screenshots'
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
  const browser = await openBrowser(9354)
  await browser.login('member')
  await browser.go('/profile')
  await browser.wait('!!document.querySelector(".profile-form")', 'formulário de perfil')
  const fixture = await browser.evaluate(
    `(()=>{const canvas=document.createElement('canvas');canvas.width=600;canvas.height=400;const ctx=canvas.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,300,400);ctx.fillStyle='#0000ff';ctx.fillRect(300,0,300,400);return canvas.toDataURL('image/png').split(',')[1]})()`,
  )
  await writeFile('/tmp/fluxo-profile-crop.png', Buffer.from(fixture, 'base64'))
  await browser.click(
    await browser.evaluate(
      'document.querySelector(".profile-form__photo-actions button").textContent.trim()',
    ),
  )
  const doc = await browser.call('DOM.getDocument')
  const node = await browser.call('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: '.profile-form input[type=file]',
  })
  await browser.call('DOM.setFileInputFiles', {
    nodeId: node.nodeId,
    files: ['/tmp/fluxo-profile-crop.png'],
  })
  await browser.wait('!!document.querySelector(".crop-surface img")', 'editor da foto')
  await browser.fill('dialog input[type=range]', '2')
  const box = await browser.evaluate(
    '(()=>{const b=document.querySelector(".crop-surface").getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height}})()',
  )
  await browser.call('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: box.x + box.width * 0.8,
    y: box.y + box.height / 2,
    button: 'left',
    clickCount: 1,
  })
  await browser.call('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: box.x + box.width * 0.2,
    y: box.y + box.height / 2,
    button: 'left',
    buttons: 1,
  })
  await browser.call('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: box.x + box.width * 0.2,
    y: box.y + box.height / 2,
    button: 'left',
    clickCount: 1,
  })
  await browser.screenshot('profile-crop-desktop')
  await browser.click('Usar esta foto')
  await browser.wait(
    '!document.querySelector("dialog") && !!document.querySelector(".profile-form__photo img")',
    'prévia aplicada',
  )
  const result = await browser.evaluate(
    `(async()=>{const img=document.querySelector('.profile-form__photo img');await img.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,1,1);return {width:img.naturalWidth,height:img.naturalHeight,color:[...ctx.getImageData(0,0,1,1).data]}})()`,
  )
  assert.equal(result.width, 200)
  assert.equal(result.height, 200)
  assert.ok(result.color[2] > 240 && result.color[0] < 15)
  await browser.click('Ajustar foto')
  await browser.wait('!!document.querySelector("dialog input[type=range]")')
  assert.equal(
    await browser.evaluate('Number(document.querySelector("dialog input[type=range]").value)'),
    2,
  )
  await browser.click('Cancelar')
  await browser.wait('!document.querySelector("dialog")')
  await browser.click('Salvar alterações')
  await browser.wait(
    'document.querySelector(".profile-form__status").innerText.includes("Nenhuma alteração")',
    'foto salva na API',
  )
  await browser.call('Page.reload')
  await pause(700)
  await browser.wait(
    '!!document.querySelector(".profile-form__photo img")',
    'foto persistida após F5',
  )
  assert.deepEqual(
    await browser.evaluate(
      '(async()=>{const img=document.querySelector(".profile-form__photo img");await img.decode();return [img.naturalWidth,img.naturalHeight]})()',
    ),
    [200, 200],
  )
  // Cancelar um novo recorte não deve descartar a foto persistida nem marcar o perfil como alterado.
  await browser.click('Trocar foto')
  const doc2 = await browser.call('DOM.getDocument')
  const node2 = await browser.call('DOM.querySelector', {
    nodeId: doc2.root.nodeId,
    selector: '.profile-form input[type=file]',
  })
  await browser.call('DOM.setFileInputFiles', {
    nodeId: node2.nodeId,
    files: ['/tmp/fluxo-profile-crop.png'],
  })
  await browser.wait('!!document.querySelector(".crop-surface img")')
  await browser.call('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await browser.evaluate('document.documentElement.dataset.theme="dark"')
  await browser.screenshot('profile-crop-mobile-dark')
  assert.equal(
    await browser.evaluate(
      'document.querySelector("dialog").getBoundingClientRect().width <= innerWidth',
    ),
    true,
  )
  await browser.click('Centralizar e redefinir zoom')
  assert.equal(
    await browser.evaluate('Number(document.querySelector("dialog input[type=range]").value)'),
    1,
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
  await browser.wait('!document.querySelector("dialog")')
  assert.equal(
    await browser.evaluate(
      'document.querySelector(".profile-form__status").innerText.includes("Nenhuma alteração")',
    ),
    true,
  )
  assert.deepEqual(browser.errors, [])
  console.log(
    'PASS perfil: zoom, arraste, recorte real, reedição, cancelamento, upload/API, F5, mobile, tema escuro e Escape',
  )
} finally {
  for (const browser of browsers) {
    browser.ws?.close()
    browser.child.kill()
  }
}
