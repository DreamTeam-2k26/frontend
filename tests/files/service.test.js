import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createFileClient } from '../../src/api/fileClient.js'
import {
  validateUpload,
  fileNameError,
  formatSize,
  recentFiles,
  downloadName,
  saveDownload,
  fileError,
} from '../../src/components/files/fileState.js'
const item = (id, folder = null, project = 3) => ({ id, folder, project, name: `Arquivo ${id}` })
test('lista todas as páginas e filtra raiz/subpasta em cada requisição com cancelamento', async () => {
  const calls = [],
    signal = new AbortController().signal
  const client = createFileClient({
    get: async (url, config) => {
      calls.push([url, config])
      return {
        data: {
          total_pages: 2,
          results: Array.from({ length: config.params.page === 1 ? 100 : 5 }, (_, i) =>
            item(i, config.params.folder ?? null),
          ),
        },
      }
    },
  })
  assert.equal((await client.list(3, null, { signal })).length, 105)
  assert.deepEqual(
    calls.map(([, config]) => config.params),
    [1, 2].map((page) => ({ project: 3, folder__isnull: true, page, page_size: 100 })),
  )
  calls.length = 0
  await client.list(3, 8, { signal })
  assert.ok(
    calls.every(
      ([url, config]) =>
        url === '/files/' &&
        config.params.folder === 8 &&
        !('folder__isnull' in config.params) &&
        config.signal === signal,
    ),
  )
})
test('rejeita arquivos de outro projeto/local e falha de página sem devolver lista parcial', async () => {
  for (const entry of [item(1, null, 9), item(1, 8)]) {
    const client = createFileClient({ get: async () => ({ data: [entry] }) })
    await assert.rejects(client.list(3), (error) => error.response.status === 404)
  }
  const client = createFileClient({
    get: async (_, config) => {
      if (config.params.page === 2) throw new Error('rede')
      return { data: { total_pages: 2, results: [item(1)] } }
    },
  })
  await assert.rejects(client.list(3), /rede/)
})
test('upload multipart preserva binário, campos opcionais, progresso e não fixa boundary', async () => {
  const requests = [],
    signal = new AbortController().signal,
    onUploadProgress = () => {}
  const client = createFileClient({
    post: async (...args) => {
      requests.push(args)
      return { data: item(1) }
    },
  })
  const file = new File(['conteúdo'], 'documento.txt', { type: 'text/plain' })
  await client.upload({ project: 3, file }, { signal, onUploadProgress })
  await client.upload({ project: 3, file, folder: 8, name: ' Novo.txt ' })
  const [url, body, config] = requests[0]
  assert.equal(url, '/files/')
  assert.ok(body instanceof FormData)
  assert.equal(body.get('project'), '3')
  assert.equal(body.has('folder'), false)
  assert.equal(body.has('name'), false)
  assert.equal(await body.get('file').text(), 'conteúdo')
  assert.equal(config.headers, undefined)
  assert.equal(config.signal, signal)
  assert.equal(config.onUploadProgress, onUploadProgress)
  assert.equal(requests[1][1].get('folder'), '8')
  assert.equal(requests[1][1].get('name'), 'Novo.txt')
})
test('rename/move/delete enviam somente metadados corretos, download usa blob privado', async () => {
  const calls = [],
    signal = new AbortController().signal
  const client = createFileClient(
    Object.fromEntries(
      ['get', 'patch', 'delete'].map((method) => [
        method,
        async (...args) => {
          calls.push([method, ...args])
          return { data: item(1) }
        },
      ]),
    ),
  )
  await client.rename(1, ' novo.txt ', { signal })
  await client.move(1, 8, { signal })
  await client.move(1, null, { signal })
  await client.remove(1, { signal })
  await client.download(1, { signal })
  assert.deepEqual(calls, [
    ['patch', '/files/1/', { name: 'novo.txt' }, { signal }],
    ['patch', '/files/1/', { folder: 8 }, { signal }],
    ['patch', '/files/1/', { folder: null }, { signal }],
    ['delete', '/files/1/', { signal }],
    ['get', '/files/1/download/', { responseType: 'blob', signal }],
  ])
})
test('erros JSON em blob são decodificados sem simular download', async () => {
  const error = {
    response: {
      status: 404,
      data: new Blob([JSON.stringify({ detail: 'Ausente' })], { type: 'application/json' }),
    },
  }
  const client = createFileClient({
    get: async () => {
      throw error
    },
  })
  await assert.rejects(
    client.download(1),
    (cause) => cause.response.status === 404 && cause.response.data.detail === 'Ausente',
  )
})
test('validação superficial segue extensões e tamanho configurável, nome máximo e mensagens do servidor', () => {
  assert.match(validateUpload(null, 20), /Selecione/)
  assert.match(validateUpload({ name: 'vazio.txt', size: 0 }, 20), /vazio/)
  for (const name of ['teste.html', 'teste.svg', 'teste.exe', 'teste.zip'])
    assert.match(validateUpload({ name, size: 100 }, 20), /Formato/)
  assert.equal(validateUpload({ name: 'Teste.PDF', size: 21 * 1024 * 1024 }, 30), '')
  assert.match(validateUpload({ name: 'Teste.PDF', size: 21 * 1024 * 1024 }, 20), /limite/)
  assert.equal(fileNameError('a'.repeat(255)), '')
  assert.match(fileNameError('a'.repeat(256)), /255/)
  assert.ok(fileNameError('../nome'))
  assert.ok(fileNameError(' '))
  assert.equal(formatSize(1024), '1 KB')
  assert.equal(formatSize(0), '0 B')
  assert.equal(
    fileError({ response: { status: 400, data: { file: ['Conteúdo incompatível.'] } } }),
    'Conteúdo incompatível.',
  )
  for (const status of [401, 403, 404, 413, 500]) assert.ok(fileError({ response: { status } }))
})
test('ordenação só usa lista completa, download preserva nome e revoga objectURL', () => {
  const list = [
    { id: 1, uploaded_at: '2026-01-01' },
    { id: 2, uploaded_at: '2026-02-01' },
  ]
  assert.deepEqual(
    recentFiles(list).map((x) => x.id),
    [2, 1],
  )
  assert.equal(list[0].id, 1)
  assert.equal(
    downloadName(
      { 'content-disposition': "attachment; filename*=UTF-8''Relat%C3%B3rio.pdf" },
      'outro',
    ),
    'Relatório.pdf',
  )
  assert.equal(downloadName({}, 'meu arquivo.txt'), 'meu arquivo.txt')
  let clicked = false,
    removed = false,
    revoked = false,
    callback
  const anchor = {
    click() {
      clicked = true
    },
    remove() {
      removed = true
    },
  }
  saveDownload(new Blob(['conteúdo']), 'Nome.txt', {
    document: { createElement: () => anchor, body: { append() {} } },
    URL: {
      createObjectURL: () => 'blob:test',
      revokeObjectURL(url) {
        assert.equal(url, 'blob:test')
        revoked = true
      },
    },
    setTimeout(fn) {
      callback = fn
    },
  })
  assert.equal(anchor.download, 'Nome.txt')
  assert.ok(clicked && removed)
  assert.equal(revoked, false)
  callback()
  assert.equal(revoked, true)
})
