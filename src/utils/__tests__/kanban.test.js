import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { loadAllPages } from '../../api/pagination.js'
import {
  EMPTY_FILTERS,
  applyMoveResult,
  buildLanes,
  canDeleteComment,
  canEditComment,
  canManageColumns,
  checklistPercent,
  dueInfo,
  filterTasks,
  groupTasks,
  hasActiveFilters,
  isHttpUrl,
  moveLocally,
  sortByPosition,
  sortTasks,
  targetPosition,
  timeAgo,
  todayISO,
} from '../kanban.js'

const task = (id, column, position, extra = {}) => ({
  id,
  column,
  position,
  title: `Tarefa ${id}`,
  priority: 'medium',
  assignee: null,
  due_date: null,
  is_overdue: false,
  ...extra,
})

describe('loadAllPages', () => {
  test('junta todas as páginas na ordem (mais de 100 itens)', async () => {
    const all = Array.from({ length: 250 }, (_, index) => ({ id: index + 1 }))
    const pages = []
    const result = await loadAllPages(async (page) => {
      pages.push(page)
      return {
        results: all.slice((page - 1) * 100, page * 100),
        total_pages: 3,
        count: 250,
      }
    })
    assert.deepEqual(pages, [1, 2, 3])
    assert.equal(result.length, 250)
    assert.deepEqual(
      result.map((item) => item.id),
      all.map((item) => item.id),
    )
  })

  test('aceita resposta sem paginação (array)', async () => {
    assert.deepEqual(await loadAllPages(async () => [{ id: 1 }]), [{ id: 1 }])
  })
})

describe('sortByPosition e groupTasks', () => {
  test('ordena por position e depois id, sem mutar', () => {
    const items = [task(3, 1, 1), task(2, 1, 0), task(1, 1, 1)]
    assert.deepEqual(
      sortByPosition(items).map((item) => item.id),
      [2, 1, 3],
    )
    assert.equal(items[0].id, 3)
  })

  test('agrupa por coluna e inclui colunas vazias', () => {
    const columns = [{ id: 10 }, { id: 20 }]
    const groups = groupTasks(columns, [task(1, 10, 1), task(2, 10, 0)])
    assert.deepEqual(
      groups.get(10).map((item) => item.id),
      [2, 1],
    )
    assert.deepEqual(groups.get(20), [])
  })
})

describe('filterTasks', () => {
  const columnsById = new Map([
    [10, { id: 10, category: 'todo' }],
    [30, { id: 30, category: 'done' }],
  ])
  const today = '2026-10-23'
  const tasks = [
    task(1, 10, 0, { title: 'Revisão da apresentação', priority: 'high', assignee: 7 }),
    task(2, 10, 1, { title: 'Comprar materiais', due_date: '2026-10-20', is_overdue: true }),
    task(3, 30, 0, { title: 'Pesquisar artigos', priority: 'low', due_date: '2026-10-30' }),
  ]
  const ids = (filters) =>
    filterTasks(tasks, { ...EMPTY_FILTERS, ...filters }, { columnsById, today }).map(
      (item) => item.id,
    )

  test('sem filtros devolve tudo', () => assert.deepEqual(ids({}), [1, 2, 3]))
  test('busca ignora acento e caixa', () => assert.deepEqual(ids({ search: 'REVISAO' }), [1]))
  test('busca também na descrição', () => {
    const withText = [...tasks, task(4, 10, 2, { description: 'Levar a cartolina azul' })]
    const found = filterTasks(withText, { ...EMPTY_FILTERS, search: 'cartolina' }).map((t) => t.id)
    assert.deepEqual(found, [4])
  })
  test('prioridade', () => assert.deepEqual(ids({ priority: 'low' }), [3]))
  test('responsável e sem responsável', () => {
    assert.deepEqual(ids({ assignee: '7' }), [1])
    assert.deepEqual(ids({ assignee: 'none' }), [2, 3])
  })
  test('coluna', () => assert.deepEqual(ids({ column: '30' }), [3]))
  test('atrasadas e sem prazo', () => {
    assert.deepEqual(ids({ due: 'overdue' }), [2])
    assert.deepEqual(ids({ due: 'no_date' }), [1])
  })
  test('filtros combinados', () => assert.deepEqual(ids({ assignee: 'none', due: 'no_date' }), []))
  test('hasActiveFilters', () => {
    assert.equal(hasActiveFilters(EMPTY_FILTERS), false)
    assert.equal(hasActiveFilters({ ...EMPTY_FILTERS, search: '  ' }), false)
    assert.equal(hasActiveFilters({ ...EMPTY_FILTERS, priority: 'high' }), true)
  })
})

describe('targetPosition', () => {
  const a = task('a', 1, 0)
  const b = task('b', 1, 1)
  const c = task('c', 1, 2)
  const d = task('d', 1, 3)
  const full = [a, b, c, d]

  test('tarefa de outra coluna antes de um card visível', () =>
    assert.equal(targetPosition(full, [a, d], 1, 'x'), 3))
  test('no fim da lista visível vai depois do último visível', () =>
    assert.equal(targetPosition(full, [a, d], 2, 'x'), 4))
  test('no início', () => assert.equal(targetPosition(full, [a, d], 0, 'x'), 0))
  test('dentro da mesma coluna desconta a própria tarefa', () =>
    assert.equal(targetPosition(full, [b, d], 1, 'b'), 3))
  test('coluna vazia', () => assert.equal(targetPosition([], [], 0, 'x'), 0))
  test('sem filtro equivale ao índice visível', () =>
    assert.equal(targetPosition(full, full, 2, 'a'), 2))
})

describe('applyMoveResult', () => {
  test('substitui só as colunas afetadas e leva a tarefa movida', () => {
    const tasks = [task(1, 10, 0), task(2, 10, 1), task(3, 20, 0), task(4, 30, 0)]
    const moved = [task(2, 10, 0), task(1, 20, 0, { title: 'movida' }), task(3, 20, 1)]
    const result = applyMoveResult(tasks, moved)
    const byId = Object.fromEntries(result.map((item) => [item.id, item]))
    assert.equal(result.length, 4)
    assert.equal(byId[1].column, 20)
    assert.equal(byId[1].title, 'movida')
    assert.equal(byId[2].position, 0)
    assert.equal(byId[3].position, 1)
    assert.deepEqual(byId[4], tasks[3])
  })
})

describe('permissões visuais', () => {
  test('colunas só para dono e administrador', () => {
    assert.equal(canManageColumns('owner'), true)
    assert.equal(canManageColumns('admin'), true)
    assert.equal(canManageColumns('member'), false)
    assert.equal(canManageColumns(undefined), false)
  })
  test('editar comentário só o autor', () => {
    assert.equal(canEditComment({ author: 5 }, 5), true)
    assert.equal(canEditComment({ author: 5 }, 6), false)
    assert.equal(canEditComment({ author: null }, 6), false)
  })
  test('excluir comentário: autor, dono ou administrador', () => {
    assert.equal(canDeleteComment({ author: 5 }, 5, 'member'), true)
    assert.equal(canDeleteComment({ author: 5 }, 6, 'member'), false)
    assert.equal(canDeleteComment({ author: 5 }, 6, 'admin'), true)
    assert.equal(canDeleteComment({ author: null }, 6, 'owner'), true)
  })
})

describe('dueInfo', () => {
  const today = '2026-10-23'
  test('sem prazo', () =>
    assert.deepEqual(dueInfo(null, today), { label: '', relative: '', tone: 'none' }))
  test('hoje, amanhã e em N dias', () => {
    assert.equal(dueInfo('2026-10-23', today).relative, 'hoje')
    assert.equal(dueInfo('2026-10-24', today).relative, 'amanhã')
    assert.equal(dueInfo('2026-10-25', today).relative, 'em 2 dias')
    assert.equal(dueInfo('2026-10-25', today).tone, 'soon')
    assert.equal(dueInfo('2026-11-10', today).tone, 'normal')
  })
  test('atrasada', () => {
    const info = dueInfo('2026-10-21', today)
    assert.equal(info.relative, 'atrasada há 2 dias')
    assert.equal(info.tone, 'late')
    assert.equal(dueInfo('2026-10-22', today).relative, 'atrasada há 1 dia')
  })
  test('concluída não fica atrasada', () => {
    const info = dueInfo('2026-10-21', today, true)
    assert.equal(info.tone, 'normal')
    assert.equal(info.relative, '')
  })
  test('rótulo curto', () => assert.equal(dueInfo('2026-10-24', today).label, '24 out'))
})

describe('utilidades', () => {
  test('todayISO usa a data local', () =>
    assert.equal(todayISO(new Date(2026, 0, 5, 23, 30)), '2026-01-05'))
  test('checklistPercent', () => {
    assert.equal(checklistPercent(3, 6), 50)
    assert.equal(checklistPercent(0, 0), 0)
    assert.equal(checklistPercent(1, 3), 33)
  })
})

describe('moveLocally', () => {
  const tasks = [task(1, 10, 0), task(2, 10, 1), task(3, 10, 2), task(4, 20, 0)]
  const order = (list, column) =>
    sortByPosition(list.filter((item) => item.column === column)).map((item) => item.id)

  test('reordena dentro da coluna e renumera a partir de zero', () => {
    const result = moveLocally(tasks, 3, 10, 0)
    assert.deepEqual(order(result, 10), [3, 1, 2])
    assert.deepEqual(
      sortByPosition(result.filter((item) => item.column === 10)).map((item) => item.position),
      [0, 1, 2],
    )
  })

  test('move entre colunas e fecha o buraco na origem', () => {
    const result = moveLocally(tasks, 1, 20, 1)
    assert.deepEqual(order(result, 10), [2, 3])
    assert.deepEqual(order(result, 20), [4, 1])
    assert.equal(result.find((item) => item.id === 2).position, 0)
  })

  test('posição além do fim vai para o fim', () => {
    assert.deepEqual(order(moveLocally(tasks, 1, 20, 99), 20), [4, 1])
  })

  test('não muta a lista original', () => {
    moveLocally(tasks, 1, 20, 0)
    assert.equal(tasks[0].column, 10)
  })
})

describe('timeAgo', () => {
  const now = new Date('2026-10-23T15:00:00')
  const at = (text) => new Date(text).toISOString()
  test('menos de um minuto', () => assert.equal(timeAgo(at('2026-10-23T14:59:30'), now), 'agora'))
  test('minutos', () => assert.equal(timeAgo(at('2026-10-23T14:55:00'), now), 'há 5 min'))
  test('horas', () => assert.equal(timeAgo(at('2026-10-23T12:00:00'), now), 'há 3 h'))
  test('ontem', () => assert.equal(timeAgo(at('2026-10-22T10:00:00'), now), 'ontem'))
  test('dias', () => assert.equal(timeAgo(at('2026-10-19T10:00:00'), now), 'há 4 dias'))
  test('mais de uma semana mostra a data', () =>
    assert.equal(timeAgo(at('2026-10-02T10:00:00'), now), '2 out'))
  test('outro ano inclui o ano', () =>
    assert.equal(timeAgo(at('2025-12-31T10:00:00'), now), '31 dez 2025'))
  test('data inválida', () => assert.equal(timeAgo('x', now), ''))
})

describe('isHttpUrl', () => {
  test('aceita http e https', () => {
    assert.equal(isHttpUrl('https://meet.google.com/abc'), true)
    assert.equal(isHttpUrl('http://exemplo.com'), true)
  })
  test('recusa outros esquemas e texto solto', () => {
    assert.equal(isHttpUrl('javascript:alert(1)'), false)
    assert.equal(isHttpUrl('ftp://exemplo.com'), false)
    assert.equal(isHttpUrl('exemplo.com'), false)
    assert.equal(isHttpUrl(''), false)
  })
})

describe('sortTasks', () => {
  const columnsById = new Map([
    [10, { id: 10, position: 0 }],
    [20, { id: 20, position: 1 }],
  ])
  const tasks = [
    task(1, 20, 0, { title: 'beta', priority: 'low', due_date: '2026-10-30' }),
    task(2, 10, 1, { title: 'Álbum', priority: 'high', due_date: null }),
    task(3, 10, 0, { title: 'cartaz', priority: 'medium', due_date: '2026-10-25' }),
  ]
  const ids = (sort) => sortTasks(tasks, sort, { columnsById }).map((item) => item.id)

  test('manual segue coluna e posição', () => assert.deepEqual(ids('manual'), [3, 2, 1]))
  test('prazo mais próximo primeiro, sem prazo no fim', () =>
    assert.deepEqual(ids('due'), [3, 1, 2]))
  test('prioridade alta primeiro', () => assert.deepEqual(ids('priority'), [2, 3, 1]))
  test('título ignora acento e caixa', () => assert.deepEqual(ids('title'), [2, 1, 3]))
  test('recentes pelo id', () => assert.deepEqual(ids('recent'), [3, 2, 1]))
  test('não muta a lista', () => {
    sortTasks(tasks, 'title', { columnsById })
    assert.deepEqual(
      tasks.map((item) => item.id),
      [1, 2, 3],
    )
  })
})

describe('buildLanes', () => {
  const columns = [
    { id: 10, name: 'A fazer', category: 'todo', position: 0 },
    { id: 20, name: 'Feito', category: 'done', position: 1 },
  ]
  const members = [
    { id: 1, user: 7, user_name: 'Ana' },
    { id: 2, user: 8, user_name: 'Bruno' },
  ]
  const tasks = [
    task(1, 10, 0, { priority: 'high', assignee: 7 }),
    task(2, 20, 0, { priority: 'low', assignee: null }),
    task(3, 10, 1, { priority: 'high', assignee: 99, assignee_name: 'Ex-membro' }),
  ]
  const summary = (lanes) => lanes.map((lane) => [lane.id, lane.tasks.map((item) => item.id)])

  test('status usa as colunas reais', () => {
    const lanes = buildLanes('status', { columns, members, tasks })
    assert.deepEqual(summary(lanes), [
      ['column-10', [1, 3]],
      ['column-20', [2]],
    ])
    assert.equal(lanes[1].tone, 'done')
    assert.equal(lanes[0].column.id, 10)
  })
  test('prioridade tem as três faixas, mesmo vazias', () => {
    const lanes = buildLanes('priority', { columns, members, tasks })
    assert.deepEqual(summary(lanes), [
      ['priority-high', [1, 3]],
      ['priority-medium', []],
      ['priority-low', [2]],
    ])
    assert.equal(lanes[0].value, 'high')
  })
  test('responsável: membros, ex-membros e sem responsável no fim', () => {
    const lanes = buildLanes('assignee', { columns, members, tasks })
    assert.deepEqual(summary(lanes), [
      ['assignee-7', [1]],
      ['assignee-8', []],
      ['assignee-99', [3]],
      ['assignee-none', [2]],
    ])
    assert.equal(lanes[2].title, 'Ex-membro')
    assert.equal(lanes[3].value, null)
  })
})
