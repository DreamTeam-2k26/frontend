import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  isProjectSectionActive,
  projectIdFromRoute,
  projectSectionFromRoute,
  projectSectionLocation,
  projectSections,
  projectTabs,
} from '../../src/config/projectNavigation.js'

test('sidebar oferece só destinos de projeto realmente existentes', () => {
  assert.deepEqual(projectSections.map((item) => item.key), [
    'geral', 'kanban', 'membros', 'conversa', 'pastas', 'links', 'reunioes', 'atividades',
  ])
  assert.equal(projectTabs.some((item) => item.key === 'kanban'), false)
})

test('navegação de abas preserva o projeto e a consulta correta', () => {
  assert.deepEqual(projectSectionLocation(42, 'geral'), {
    name: 'project-detail', params: { id: '42' },
  })
  assert.deepEqual(projectSectionLocation(42, 'pastas'), {
    name: 'project-detail', params: { id: '42' }, query: { aba: 'pastas' },
  })
  assert.deepEqual(projectSectionLocation(42, 'kanban'), {
    name: 'project-kanban', params: { id: '42' },
  })
})

test('marca só a seção ativa e acompanha rotas antigas', () => {
  const detail = { name: 'project-detail', params: { id: '42' }, query: { aba: 'links' } }
  assert.equal(projectIdFromRoute(detail), '42')
  assert.equal(projectSectionFromRoute(detail), 'links')
  assert.equal(isProjectSectionActive(detail, 42, 'links'), true)
  assert.equal(isProjectSectionActive(detail, 42, 'geral'), false)
  assert.equal(isProjectSectionActive(detail, 43, 'links'), false)
  assert.equal(projectSectionFromRoute({ ...detail, query: { aba: 'inexistente' } }), 'geral')
  assert.equal(projectSectionFromRoute({
    name: 'project-members', params: { id: 42 },
  }), 'membros')
  assert.equal(projectSectionFromRoute({
    name: 'project-folders', params: { id: 42 }, query: { pasta: '8' },
  }), 'pastas')
  assert.equal(projectSectionFromRoute({
    name: 'call', params: { id: 42, callId: 7 },
  }), 'reunioes')
})

test('não atribui projeto a páginas pessoais, chat global ou ids inválidos', () => {
  assert.equal(projectIdFromRoute({ name: 'home', params: { id: '42' } }), null)
  assert.equal(projectIdFromRoute({ name: 'chat', params: { roomId: '5' } }), null)
  assert.equal(projectIdFromRoute({ name: 'project-detail', params: { id: 'oops' } }), null)
  assert.equal(projectSectionFromRoute({ name: 'projects', params: {} }), null)
})

import { rememberOpenedProject } from '../../src/utils/openedProjects.js'

test('sidebar inicia vazia e só mostra projetos efetivamente abertos', () => {
  const initially = []
  assert.deepEqual(initially, [])
  const first = rememberOpenedProject(initially, { id: 31, name: 'Feira de Ciências 2026' })
  assert.deepEqual(first, [{ id: 31, name: 'Feira de Ciências 2026' }])
  assert.deepEqual(initially, [])
})

test('abrir outro projeto mantém o anterior recolhível e traz o novo para o fim', () => {
  const a = rememberOpenedProject([], { id: 1, name: 'Feira de Ciências 2026' })
  const b = rememberOpenedProject(a, { id: 2, name: 'Projeto de Extensão' })
  assert.deepEqual(b.map(({ id }) => id), [1, 2])
  const revisited = rememberOpenedProject(b, { id: 1, name: 'Feira de Ciências Atualizada' })
  assert.deepEqual(revisited, [
    { id: 2, name: 'Projeto de Extensão' },
    { id: 1, name: 'Feira de Ciências Atualizada' },
  ])
})

test('limita projetos recentes e descarta payloads sem id/nome válidos', () => {
  let recent = []
  for (let id = 1; id <= 9; id++) {
    recent = rememberOpenedProject(recent, { id, name: 'Projeto ' + id })
  }
  assert.deepEqual(recent.map((project) => project.id), [5, 6, 7, 8, 9])
  assert.deepEqual(rememberOpenedProject(recent, { id: 0, name: 'Inválido' }), recent)
  assert.deepEqual(rememberOpenedProject(recent, { id: 10, name: ' ' }), recent)
})
