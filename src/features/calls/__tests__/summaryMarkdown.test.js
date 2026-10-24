import assert from 'node:assert/strict'
import { test } from 'node:test'
import { summaryBlocks } from '../lib/summaryMarkdown.js'

test('converte títulos, itens e parágrafos em blocos', () => {
  const blocks = summaryBlocks(
    '## Resumo\nFalaram do **prazo**.\n\n## Tarefas\n- Ana: revisar\n* Bia: testar\n1. Cadu: publicar',
  )

  assert.deepEqual(blocks, [
    { type: 'heading', text: 'Resumo' },
    { type: 'text', text: 'Falaram do prazo.' },
    { type: 'heading', text: 'Tarefas' },
    { type: 'item', text: 'Ana: revisar' },
    { type: 'item', text: 'Bia: testar' },
    { type: 'item', text: 'Cadu: publicar' },
  ])
})

test('HTML no texto continua sendo só texto e entrada vazia vira lista vazia', () => {
  assert.deepEqual(summaryBlocks('<img src=x onerror=alert(1)>'), [
    { type: 'text', text: '<img src=x onerror=alert(1)>' },
  ])
  assert.deepEqual(summaryBlocks(''), [])
  assert.deepEqual(summaryBlocks(null), [])
})
