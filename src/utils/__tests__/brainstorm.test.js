import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  allSelected,
  approvalPayload,
  buildThread,
  cardsFromAnalysis,
  categoryLabel,
  formatWhen,
  listQueryToRoute,
  normalizeListQuery,
  preview,
  setAllSelected,
  statusLabel,
  topicFlags,
  wasEdited,
} from '../brainstorm.js'

const topic = (extra = {}) => ({
  id: 1,
  author: 7,
  status: 'open',
  cycle: 1,
  replies_count: 0,
  upvotes: 0,
  downvotes: 0,
  in_review: false,
  current_decision: null,
  ...extra,
})

describe('rótulos', () => {
  test('categoria e status em português, com fallback', () => {
    assert.equal(categoryLabel('questions'), 'Dúvidas')
    assert.equal(statusLabel('decided'), 'Decidida')
    assert.equal(statusLabel('archived'), 'Arquivada')
    assert.equal(categoryLabel('outra'), 'outra')
  })
})

describe('topicFlags', () => {
  test('membro autor edita e exclui só enquanto não houver interações', () => {
    const flags = topicFlags(topic(), { role: 'member', userId: 7 })
    assert.equal(flags.canEdit, true)
    assert.equal(flags.canDelete, true)
    assert.equal(flags.canClose, false)
    assert.equal(flags.readOnly, false)
    assert.equal(
      topicFlags(topic({ replies_count: 1 }), { role: 'member', userId: 7 }).canDelete,
      false,
    )
    assert.equal(topicFlags(topic({ upvotes: 1 }), { role: 'member', userId: 7 }).canDelete, false)
    assert.equal(topicFlags(topic({ cycle: 2 }), { role: 'owner', userId: 1 }).canDelete, false)
  })

  test('outro membro não edita nem exclui', () => {
    const flags = topicFlags(topic(), { role: 'member', userId: 9 })
    assert.deepEqual([flags.canEdit, flags.canDelete, flags.canArchive], [false, false, false])
  })

  test('dono/admin gerenciam conforme o status', () => {
    const open = topicFlags(topic(), { role: 'admin', userId: 1 })
    assert.deepEqual(
      [open.canClose, open.canReopen, open.canAnalyze, open.canArchive],
      [true, false, false, true],
    )
    const closed = topicFlags(topic({ status: 'closed' }), { role: 'owner', userId: 1 })
    assert.deepEqual(
      [closed.canClose, closed.canReopen, closed.canAnalyze, closed.canApprove],
      [false, true, true, true],
    )
    assert.equal(closed.readOnly, true)
    const decided = topicFlags(topic({ status: 'decided' }), { role: 'owner', userId: 1 })
    assert.deepEqual(
      [decided.canReopen, decided.canAnalyze, decided.canApprove],
      [true, false, false],
    )
  })

  test('arquivada é só leitura para todos', () => {
    const flags = topicFlags(topic({ status: 'archived', author: 1 }), { role: 'owner', userId: 1 })
    assert.equal(flags.readOnly, true)
    assert.deepEqual(
      [
        flags.canEdit,
        flags.canDelete,
        flags.canClose,
        flags.canReopen,
        flags.canArchive,
        flags.canVote,
      ],
      [false, false, false, false, false, false],
    )
  })

  test('em revisão vem do backend', () => {
    assert.equal(
      topicFlags(topic({ in_review: true }), { role: 'member', userId: 1 }).inReview,
      true,
    )
  })
})

describe('buildThread', () => {
  test('monta a árvore em ordem e trata pai ausente como raiz', () => {
    const replies = [
      { id: 1, parent: null },
      { id: 2, parent: 1 },
      { id: 3, parent: null },
      { id: 4, parent: 2 },
      { id: 5, parent: 99 },
    ]
    const tree = buildThread(replies)
    assert.deepEqual(
      tree.map((node) => node.reply.id),
      [1, 3, 5],
    )
    assert.equal(tree[0].children[0].reply.id, 2)
    assert.equal(tree[0].children[0].children[0].reply.id, 4)
  })
})

describe('lista na URL', () => {
  test('normaliza a query e ignora valores inválidos', () => {
    assert.deepEqual(
      normalizeListQuery({ busca: ' feira ', categoria: 'ideas', status: 'x', ordem: '-score' }),
      {
        search: 'feira',
        category: 'ideas',
        status: '',
        ordering: '-score',
      },
    )
    assert.deepEqual(normalizeListQuery({}), {
      search: '',
      category: '',
      status: '',
      ordering: '-created_at',
    })
  })

  test('volta para a query sem campos padrão', () => {
    assert.deepEqual(
      listQueryToRoute({ search: 'a', category: '', status: 'archived', ordering: '-created_at' }),
      {
        busca: 'a',
        categoria: undefined,
        status: 'archived',
        ordem: undefined,
      },
    )
  })
})

describe('decisão', () => {
  const result = {
    task_suggestions: [
      { title: 'Montar protótipo', description: 'x', priority: 'high', existing_task_id: null },
      { title: 'Comprar motores', description: '', priority: 'medium', existing_task_id: 42 },
    ],
  }

  test('cards começam desmarcados; sugestão de tarefa existente já aponta para ela', () => {
    const cards = cardsFromAnalysis(result)
    assert.equal(cards.length, 2)
    assert.ok(cards.every((card) => card.selected === false))
    assert.deepEqual(
      [cards[0].mode, cards[1].mode, cards[1].existingTaskId],
      ['new', 'existing', 42],
    )
    assert.equal(cards[0].suggestionIndex, 0)
    assert.equal(cardsFromAnalysis(null).length, 0)
  })

  test('payload só com os cards marcados e campos explícitos', () => {
    const cards = cardsFromAnalysis(result)
    cards[0].selected = true
    cards[0].title = '  Montar protótipo v1 '
    cards[0].assignee = 3
    cards[0].dueDate = ''
    cards[1].selected = true
    const body = approvalPayload({ analysisId: 7, text: ' Robótica ', justification: '', cards })
    assert.deepEqual(body, {
      analysis: 7,
      text: 'Robótica',
      justification: '',
      tasks: [
        {
          suggestion_index: 0,
          title: 'Montar protótipo v1',
          description: 'x',
          priority: 'high',
          assignee: 3,
          due_date: null,
        },
        { suggestion_index: 1, existing_task_id: 42 },
      ],
    })
  })

  test('nenhum card marcado aprova só o texto', () => {
    const body = approvalPayload({
      analysisId: 7,
      text: 'a',
      justification: 'b',
      cards: cardsFromAnalysis(result),
    })
    assert.deepEqual(body.tasks, [])
  })
})

describe('formatação', () => {
  test('prévia corta no limite sem quebrar palavra e tolera vazio', () => {
    assert.equal(
      preview('Precisamos escolher o tema da feira até sexta', 20),
      'Precisamos escolher…',
    )
    assert.equal(preview('curto', 20), 'curto')
    assert.equal(preview(null, 20), '')
  })

  test('data curta em pt-BR e vazio para inválida', () => {
    assert.match(formatWhen('2026-10-20T15:30:00-03:00'), /20\/10\/2026/)
    assert.equal(formatWhen('x'), '')
  })
})

describe('wasEdited', () => {
  test('só marca editada quando a alteração veio depois da criação (não por milissegundos)', () => {
    const created = '2026-10-24T03:35:10.100000-03:00'
    assert.equal(
      wasEdited({ created_at: created, updated_at: '2026-10-24T03:35:10.180000-03:00' }),
      false,
    )
    assert.equal(
      wasEdited({ created_at: created, updated_at: '2026-10-24T03:36:00.000000-03:00' }),
      true,
    )
    assert.equal(wasEdited({ created_at: created }), false)
  })
})

describe('selecionar todas as tarefas', () => {
  test('marca todas, desmarca todas e informa o estado atual', () => {
    const cards = [{ selected: false }, { selected: true }]
    assert.equal(allSelected(cards), false)
    setAllSelected(cards, true)
    assert.deepEqual(
      cards.map((card) => card.selected),
      [true, true],
    )
    assert.equal(allSelected(cards), true)
    setAllSelected(cards, false)
    assert.deepEqual(
      cards.map((card) => card.selected),
      [false, false],
    )
    assert.equal(allSelected([]), false)
  })
})
