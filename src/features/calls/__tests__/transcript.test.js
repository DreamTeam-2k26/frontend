import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  downloadName,
  formatOffset,
  groupTurns,
  mergeSegments,
  normalizeSegment,
  toDocument,
  transcriptBadge,
} from '../lib/transcript.js'

const seg = (id, user, name, text, offset_ms) => ({ id, user, name, text, offset_ms })

test('formatOffset mostra mm:ss e h:mm:ss', () => {
  assert.equal(formatOffset(0), '00:00')
  assert.equal(formatOffset(65_000), '01:05')
  assert.equal(formatOffset(3_725_000), '1:02:05')
  assert.equal(formatOffset(-5), '00:00')
  assert.equal(formatOffset('x'), '00:00')
})

test('normalizeSegment descarta lixo e preenche padrões', () => {
  assert.equal(normalizeSegment(null), null)
  assert.equal(normalizeSegment({ id: 'a', text: 'oi' }), null)
  assert.equal(normalizeSegment({ id: 1, text: '   ' }), null)
  assert.deepEqual(normalizeSegment({ id: 1, user: 3, text: ' oi ', extra: 1 }), {
    id: 1,
    user: 3,
    name: 'Participante',
    text: 'oi',
    offset_ms: 0,
  })
})

test('mergeSegments não repete ids, ordena e não altera a lista original', () => {
  const current = [seg(2, 1, 'Ana', 'segunda', 2000)]
  const merged = mergeSegments(current, [
    seg(1, 2, 'Bia', 'primeira', 1000),
    seg(2, 1, 'Ana', 'segunda (repetida)', 2000),
    { id: 'x' },
    seg(3, 1, 'Ana', 'terceira', 3000),
  ])

  assert.deepEqual(
    merged.map((s) => s.text),
    ['primeira', 'segunda', 'terceira'],
  )
  assert.equal(current.length, 1)
})

test('groupTurns junta falas seguidas da mesma pessoa e separa por pessoa ou pausa longa', () => {
  const turns = groupTurns([
    seg(1, 1, 'Ana', 'Bom dia', 1000),
    seg(2, 1, 'Ana', 'vamos começar', 6000),
    seg(3, 2, 'Bia', 'Oi', 9000),
    seg(4, 1, 'Ana', 'Depois de muito tempo', 200_000),
  ])

  assert.equal(turns.length, 3)
  assert.deepEqual(turns[0].texts, ['Bom dia', 'vamos começar'])
  assert.equal(turns[1].name, 'Bia')
  assert.equal(turns[2].offset_ms, 200_000)
})

test('toDocument gera txt e md com nomes, horários e resumo', () => {
  const call = { title: 'Daily', project_name: 'Fluxo' }
  const segments = [seg(1, 1, 'Ana', 'Bom dia', 1000), seg(2, 2, 'Bia', 'Oi', 70_000)]
  const txt = toDocument(call, segments, { summary: 'Falaram oi.' })

  assert.match(txt, /^Daily\nProjeto: Fluxo/)
  assert.match(txt, /RESUMO\nFalaram oi\./)
  assert.match(txt, /\[00:01\] Ana\nBom dia/)
  assert.match(txt, /\[01:10\] Bia\nOi\n$/)

  const md = toDocument(call, segments, { format: 'md' })

  assert.match(md, /^# Daily/)
  assert.match(md, /## Transcrição/)
  assert.match(md, /\*\*\[00:01\] Ana\*\*\nBom dia/)
  assert.doesNotMatch(md, /Resumo/)
})

test('toDocument avisa quando não há falas', () => {
  assert.match(toDocument({ title: 'X' }, []), /\(sem falas transcritas\)/)
})

test('downloadName gera nome seguro', () => {
  assert.equal(downloadName({ title: 'Reunião do Projeto!' }), 'transcricao-reuniao-do-projeto.txt')
  assert.equal(downloadName({ title: '***' }, 'md'), 'transcricao-reuniao.md')
  assert.equal(downloadName(null, 'zip'), 'transcricao-reuniao.txt')
})

test('transcriptBadge resume a reunião encerrada', () => {
  assert.equal(transcriptBadge({ segments_count: 0 }), '')
  assert.equal(transcriptBadge({ segments_count: 1 }), '1 fala')
  assert.equal(transcriptBadge({ segments_count: 12, has_summary: true }), '12 falas · com resumo')
})
