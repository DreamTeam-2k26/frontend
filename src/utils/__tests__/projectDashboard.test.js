import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { mergeUpcoming, toMetrics } from '../projectDashboard.js'

describe('toMetrics', () => {
  const api = {
    total_tasks: 10,
    done_tasks: 4,
    pending_tasks: 6,
    todo_tasks: 3,
    in_progress_tasks: 3,
    overdue_tasks: 2,
    progress: 40,
  }

  test('mapeia os campos do backend sem recalcular', () =>
    assert.deepEqual(toMetrics(api), {
      total: 10,
      done: 4,
      pending: 6,
      todo: 3,
      inProgress: 3,
      overdue: 2,
      progress: 40,
    }))

  test('projeto sem tarefas: tudo zero é válido', () =>
    assert.deepEqual(
      toMetrics({
        ...api,
        total_tasks: 0,
        done_tasks: 0,
        pending_tasks: 0,
        todo_tasks: 0,
        in_progress_tasks: 0,
        overdue_tasks: 0,
        progress: 0,
      }),
      { total: 0, done: 0, pending: 0, todo: 0, inProgress: 0, overdue: 0, progress: 0 },
    ))

  test('pendentes ausente cai na regra da API (total - concluídas)', () => {
    const { pending_tasks: _, ...rest } = api
    assert.equal(toMetrics(rest).pending, 6)
  })

  test('progresso fica entre 0 e 100', () => {
    assert.equal(toMetrics({ ...api, progress: 140 }).progress, 100)
    assert.equal(toMetrics({ ...api, progress: -3 }).progress, 0)
  })

  test('resposta inválida não vira métrica fictícia', () => {
    assert.equal(toMetrics(null), null)
    assert.equal(toMetrics({ ...api, total_tasks: 'dez' }), null)
    assert.equal(toMetrics({ ...api, done_tasks: undefined }), null)
  })
})

describe('mergeUpcoming', () => {
  const task = (id, due) => ({ id, due_date: due, title: `T${id}` })

  test('junta as listas por prazo mais próximo e limita', () =>
    assert.deepEqual(
      mergeUpcoming(
        [[task(1, '2026-10-26'), task(2, '2026-10-30')], [task(3, '2026-10-24')]],
        2,
      ).map((item) => item.id),
      [3, 1],
    ))

  test('mesmo prazo desempata pelo id e não repete tarefa', () =>
    assert.deepEqual(
      mergeUpcoming(
        [[task(5, '2026-10-25'), task(2, '2026-10-25')], [task(2, '2026-10-25')]],
        3,
      ).map((item) => item.id),
      [2, 5],
    ))

  test('listas vazias', () => assert.deepEqual(mergeUpcoming([[], []], 3), []))
})
