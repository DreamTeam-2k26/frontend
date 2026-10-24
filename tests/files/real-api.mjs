// Opt-in: somente backend/banco de teste. Não imprime tokens nem senhas.
import assert from 'node:assert/strict'
import process from 'node:process'
import { writeFile } from 'node:fs/promises'
import axios from 'axios'
import { createFileClient } from '../../src/api/fileClient.js'
const base = process.env.FLUXO_TEST_API || 'http://127.0.0.1:8043/api/'
const stamp = Date.now(),
  password = `Fluxo-files-${stamp}-Q!`,
  accounts = {}
async function request(path, { token, method = 'GET', body, status = 200 } = {}) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(body && { 'Content-Type': 'application/json' }),
    },
    ...(body && { body: JSON.stringify(body) }),
  })
  assert.equal(response.status, status, `${method} ${path.split('?')[0]} HTTP ${response.status}`)
  return response.status === 204 ? null : response.json()
}
for (const name of ['owner', 'admin', 'member', 'outsider']) {
  const email = `files43-${stamp}-${name}@example.test`
  await request('register/', {
    method: 'POST',
    body: { name: `Teste ${name}`, email, password },
    status: 201,
  })
  accounts[name] = {
    email,
    password,
    ...(await request('token/', { method: 'POST', body: { email, password } })),
  }
}
const owner = accounts.owner.access
const project = await request('projects/', {
  token: owner,
  method: 'POST',
  body: {
    name: 'Feira de Ciências — Arquivos #43',
    description: 'Materiais e documentos da equipe.',
  },
  status: 201,
})
for (const [name, role] of [
  ['admin', 'admin'],
  ['member', 'member'],
]) {
  const users = await request(
    `invites/find_user/?project=${project.id}&email=${encodeURIComponent(accounts[name].email)}`,
    { token: owner },
  )
  const invite = await request('invites/', {
    token: owner,
    method: 'POST',
    body: { project: project.id, kind: 'direct', role, invited_user: users[0].id },
    status: 201,
  })
  await request(`invites/${invite.id}/accept/`, { token: accounts[name].access, method: 'POST' })
}
const folderList = []
for (const name of ['Documentos gerais', 'Imagens e referências', 'Apresentação', 'Relatórios'])
  folderList.push(
    await request('folders/', {
      token: owner,
      method: 'POST',
      body: { project: project.id, name },
      status: 201,
    }),
  )
const child = await request('folders/', {
  token: owner,
  method: 'POST',
  body: { project: project.id, parent: folderList[0].id, name: 'Atas' },
  status: 201,
})
const other = await request('projects/', {
  token: owner,
  method: 'POST',
  body: { name: 'Outro projeto — teste isolamento' },
  status: 201,
})
const foreign = await request('folders/', {
  token: owner,
  method: 'POST',
  body: { project: other.id, name: 'Pasta alheia' },
  status: 201,
})
function client(name) {
  const api = axios.create({
    baseURL: base,
    headers: { Authorization: `Bearer ${accounts[name].access}` },
  })
  // Axios Node não implementa blob. Converte apenas o transporte do teste, mantendo o client real.
  return createFileClient({
    get: async (path, options) => {
      const result = await api.get(path, {
        ...options,
        ...(options.responseType === 'blob' && { responseType: 'arraybuffer' }),
      })
      if (options.responseType === 'blob') result.data = new Blob([result.data])
      return result
    },
    post: (...args) => api.post(...args),
    patch: (...args) => api.patch(...args),
    delete: (...args) => api.delete(...args),
  })
}
const member = client('member'),
  admin = client('admin'),
  ownerFiles = client('owner'),
  outsider = client('outsider')
const content = 'Material de teste real do Fluxo.\nEquipe de ciências e referências.\n'
const txt = new File([content], 'Plano.txt', { type: 'text/plain' })
const uploaded = await member.upload({ project: project.id, file: txt })
assert.equal(uploaded.folder, null)
assert.equal(uploaded.size, new TextEncoder().encode(content).length)
assert.equal(uploaded.uploaded_by_name, 'Teste member')
assert.equal((await member.list(project.id)).length, 1)
assert.equal(await (await admin.download(uploaded.id)).data.text(), content)
await admin.rename(uploaded.id, 'Plano da equipe.txt')
await member.move(uploaded.id, child.id)
assert.equal((await member.list(project.id)).length, 0)
assert.equal((await member.list(project.id, child.id))[0].name, 'Plano da equipe.txt')
await assert.rejects(member.move(uploaded.id, foreign.id), (error) => error.response.status === 400)
for (const action of [
  () => outsider.download(uploaded.id),
  () => outsider.rename(uploaded.id, 'indevido.txt'),
  () => outsider.remove(uploaded.id),
])
  await assert.rejects(action(), (error) => error.response.status === 404)
await member.move(uploaded.id, null)
await ownerFiles.remove(uploaded.id)
await assert.rejects(member.download(uploaded.id), (error) => error.response.status === 404)
await request(`files/${uploaded.id}/download/`, { status: 401 })
for (const file of [
  new File([], 'vazio.txt'),
  new File(['<html>indevido</html>'], 'pagina.html'),
  new File(['texto não é PDF'], 'incompativel.pdf'),
  new File([new Uint8Array(21 * 1024 * 1024)], 'grande.txt'),
])
  await assert.rejects(
    member.upload({ project: project.id, file }),
    (error) => error.response.status === 400,
  )
console.log(
  'PASS backend real: multipart, raiz/pasta, download privado, owner/admin/member, rename/move/delete, isolamento, 401/404 e validações',
)
// Paginação real pelo client: 105 uploads leves, sem semear registros diretamente no banco.
const volume = await request('folders/', {
  token: owner,
  method: 'POST',
  body: { project: project.id, name: 'Volume de teste' },
  status: 201,
})
for (let i = 0; i < 105; i++)
  await member.upload({
    project: project.id,
    folder: volume.id,
    file: new File([content], `Volume-${i}.txt`),
  })
assert.equal((await member.list(project.id, volume.id)).length, 105)
console.log('PASS backend real: 105 arquivos retornados com paginação completa')
await request(`folders/${volume.id}/`, { token: owner, method: 'DELETE', status: 204 })
const pdf = new File(
  ['%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n'],
  'Relatório_final.pdf',
  { type: 'application/pdf' },
)
await ownerFiles.upload({ project: project.id, file: pdf })
await admin.upload({ project: project.id, file: new File([content], 'Apresentação.md') })
await member.upload({
  project: project.id,
  file: new File(['Amostra,Resultado\nA,10\nB,12\n'], 'Planilha_ensaios.csv'),
})
await member.upload({ project: project.id, folder: folderList[0].id, file: txt })
await writeFile(
  '/tmp/fluxo43-sessions.json',
  JSON.stringify({ accounts, project, folders: folderList, child, other }),
  { mode: 0o600 },
)
await writeFile('/tmp/fluxo43-upload.txt', content)
console.log('PASS fixture privada preparada para revisão no navegador')
