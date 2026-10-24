import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadProjectPages } from '../../src/api/projectPagination.js'
import {
  filterProjects,
  projectError,
  projectFieldErrors,
} from '../../src/components/projects/projectState.js'

const projects = [
  { id: 1, name: 'Ciências da Natureza', role: 'owner' },
  { id: 2, name: 'História', role: 'admin' },
  { id: 3, name: 'Clube de Ciências', role: 'member' },
]

test('busca por nome preserva todos os papéis e ignora caixa/espaços externos', () => {
  assert.deepEqual(filterProjects(projects, ''), projects)
  assert.deepEqual(
    filterProjects(projects, '  CIÊNCIAS  ').map(({ id }) => id),
    [1, 3],
  )
  assert.deepEqual(filterProjects(projects, 'inexistente'), [])
  assert.equal(projects.length, 3)
})

test('erros de sessão, permissão, inexistência e rede têm mensagens distintas', () => {
  const messages = [401, 403, 404, 400, 500].map((status) => projectError({ response: { status } }))
  assert.equal(new Set(messages).size, 5)
  assert.equal(projectError(new Error('Network Error')), messages[4])
})

test('validação da API associa mensagens aos campos sem expor dados arbitrários', () => {
  assert.deepEqual(
    projectFieldErrors({
      response: {
        status: 400,
        data: {
          name: ['Nome obrigatório.', 'Máximo 100 caracteres.'],
          description: ['Descrição inválida.'],
          created_by: ['Privado'],
        },
      },
    }),
    { name: 'Nome obrigatório. Máximo 100 caracteres.', description: 'Descrição inválida.' },
  )
  assert.deepEqual(projectFieldErrors({ response: { status: 403, data: { name: ['Erro'] } } }), {})
  assert.deepEqual(projectFieldErrors(new Error('offline')), {})
})

test('lista paginada inclui projetos além da primeira página na busca local', async () => {
  const pages = []
  const result = await loadProjectPages(async (page) => {
    pages.push(page)
    return { page, total_pages: 3, results: [projects[page - 1]] }
  })
  assert.deepEqual(pages, [1, 2, 3])
  assert.deepEqual(result, projects)
  assert.deepEqual(filterProjects(result, 'Clube'), [projects[2]])
})

test('falha em página intermediária não apresenta uma lista incompleta como sucesso', async () => {
  await assert.rejects(
    loadProjectPages(async (page) => {
      if (page === 2) throw new Error('offline')
      return { total_pages: 2, results: [projects[0]] }
    }),
    /offline/,
  )
  assert.deepEqual(await loadProjectPages(async () => []), [])
  assert.deepEqual(await loadProjectPages(async () => ({ total_pages: 1, results: [] })), [])
})
