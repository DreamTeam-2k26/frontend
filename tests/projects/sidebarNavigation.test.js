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

test('navegação do projeto segue o layout e só contém páginas já existentes', () => {
  assert.deepEqual(
    projectSections.map((item) => item.key),
    [
      'geral',
      'kanban',
      'pastas',
      'conversa',
      'reunioes',
      'membros',
      'links',
      'atividades',
      'settings',
    ],
  )
  assert.deepEqual(
    projectSections.map((item) => item.label),
    [
      'Visão geral',
      'Kanban',
      'Arquivos',
      'Conversas',
      'Reuniões',
      'Participantes',
      'Links de apoio',
      'Registros recentes',
      'Configurações',
    ],
  )
  assert.equal(
    projectTabs.some((item) => item.key === 'kanban'),
    false,
  )
  assert.ok(projectTabs.every((item) => item.key !== 'brainstorm'))
})

test('todas as seções usam o id do projeto atual sem destinos inventados', () => {
  assert.deepEqual(projectSectionLocation(42, 'geral'), {
    name: 'project-detail',
    params: { id: '42' },
  })
  assert.deepEqual(projectSectionLocation(42, 'pastas'), {
    name: 'project-detail',
    params: { id: '42' },
    query: { aba: 'pastas' },
  })
  assert.deepEqual(projectSectionLocation(42, 'kanban'), {
    name: 'project-kanban',
    params: { id: '42' },
  })
  assert.deepEqual(projectSectionLocation(99, 'membros'), {
    name: 'project-detail',
    params: { id: '99' },
    query: { aba: 'membros' },
  })
})

test('destaca somente o projeto e a seção visitados', () => {
  const a = { name: 'project-detail', params: { id: '42' }, query: { aba: 'links' } }
  const b = { name: 'project-detail', params: { id: '99' }, query: { aba: 'pastas' } }
  assert.equal(projectIdFromRoute(a), '42')
  assert.equal(projectIdFromRoute(b), '99')
  assert.equal(isProjectSectionActive(a, 42, 'links'), true)
  assert.equal(isProjectSectionActive(a, 99, 'links'), false)
  assert.equal(isProjectSectionActive(b, 99, 'pastas'), true)
  assert.equal(isProjectSectionActive(b, 42, 'pastas'), false)
  assert.equal(projectSectionFromRoute({ ...a, query: { aba: 'inexistente' } }), 'geral')
})

test('identifica links diretos e rotas legadas de um projeto', () => {
  assert.equal(
    projectSectionFromRoute({
      name: 'project-members',
      params: { id: 42 },
    }),
    'membros',
  )
  assert.equal(
    projectSectionFromRoute({
      name: 'project-folders',
      params: { id: 42 },
      query: { pasta: '8' },
    }),
    'pastas',
  )
  assert.equal(
    projectSectionFromRoute({
      name: 'call',
      params: { id: 42, callId: 7 },
    }),
    'reunioes',
  )
})

test('páginas pessoais não substituem o contexto do último projeto aberto', () => {
  for (const name of ['home', 'projects', 'chat', 'settings']) {
    assert.equal(projectIdFromRoute({ name, params: { id: '42' } }), null)
    assert.equal(projectSectionFromRoute({ name, params: {} }), null)
  }
  assert.equal(projectIdFromRoute({ name: 'project-detail', params: { id: 'oops' } }), null)
})

test('configurações possuem rota própria e nunca viram aba vazia', () => {
  assert.equal(
    projectTabs.some(({ key }) => key === 'settings'),
    false,
  )
  for (const id of ['42', '99']) {
    const location = projectSectionLocation(id, 'settings')
    assert.deepEqual(location, { name: 'project-settings', params: { id } })
    assert.equal(projectIdFromRoute(location), id)
    assert.equal(projectSectionFromRoute(location), 'settings')
    assert.equal(isProjectSectionActive(location, id, 'settings'), true)
    assert.equal(isProjectSectionActive(location, '100', 'settings'), false)
  }
})
