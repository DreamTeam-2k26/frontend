import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  dayKey,
  formatDay,
  formatLastSeen,
  formatListTime,
  formatSize,
  messagePreview,
  initials,
} from '../lib/format.js'
import { apiOrigin, chatSocketUrl, mediaUrl } from '../lib/urls.js'

test('apiOrigin usa a origem da API absoluta e a da página quando é relativa', () => {
  assert.equal(
    apiOrigin('http://localhost:8000/api', 'http://localhost:5173'),
    'http://localhost:8000',
  )
  assert.equal(apiOrigin('/api', 'https://app.exemplo.com'), 'https://app.exemplo.com')
  assert.equal(apiOrigin('', 'https://app.exemplo.com'), 'https://app.exemplo.com')
})

test('chatSocketUrl troca http por ws, https por wss e codifica o token', () => {
  assert.equal(
    chatSocketUrl('a.b+c', 'http://localhost:8000/api', 'http://x'),
    'ws://localhost:8000/ws/chat/?token=a.b%2Bc',
  )
  assert.equal(
    chatSocketUrl('t', 'https://api.exemplo.com/api', 'https://x'),
    'wss://api.exemplo.com/ws/chat/?token=t',
  )
  assert.equal(chatSocketUrl('t', '/api', 'https://site.com'), 'wss://site.com/ws/chat/?token=t')
})

test('mediaUrl mantém URLs absolutas, completa caminhos relativos e ignora vazio', () => {
  assert.equal(mediaUrl(null, 'http://h/api'), null)
  assert.equal(
    mediaUrl('https://res.cloudinary.com/x.png', 'http://h/api'),
    'https://res.cloudinary.com/x.png',
  )
  assert.equal(
    mediaUrl('/media/a.png', 'http://localhost:8000/api', 'http://p'),
    'http://localhost:8000/media/a.png',
  )
  assert.equal(
    mediaUrl('media/a.png', 'http://localhost:8000/api', 'http://p'),
    'http://localhost:8000/media/a.png',
  )
})

test('formatSize', () => {
  assert.equal(formatSize(0), '0 B')
  assert.equal(formatSize(1023), '1023 B')
  assert.equal(formatSize(1536), '1,5 KB')
  assert.equal(formatSize(5 * 1024 * 1024), '5 MB')
  assert.equal(formatSize(undefined), '')
  assert.equal(formatSize(-1), '')
})

test('initials', () => {
  assert.equal(initials('ana'), 'A')
  assert.equal(initials('ana.silva'), 'AS')
  assert.equal(initials('  maria_da-costa '), 'MD')
  assert.equal(initials(''), '?')
  assert.equal(initials(null), '?')
})

test('formatDay e formatListTime relativos a "agora"', () => {
  const now = new Date(2026, 9, 23, 15, 0)

  assert.equal(formatDay(new Date(2026, 9, 23, 8, 0), now), 'Hoje')
  assert.equal(formatDay(new Date(2026, 9, 22, 23, 59), now), 'Ontem')
  assert.match(formatDay(new Date(2026, 9, 1), now), /2026/)
  assert.equal(formatListTime(new Date(2026, 9, 22, 10, 0), now), 'Ontem')
  assert.match(formatListTime(new Date(2026, 9, 23, 9, 5), now), /09:05/)
  assert.equal(formatListTime(new Date(2026, 9, 20), now), '20/10')
  assert.equal(formatDay('lixo'), '')
})

test('dayKey agrupa pelo dia local', () => {
  assert.equal(dayKey(new Date(2026, 9, 23, 1)), dayKey(new Date(2026, 9, 23, 23)))
  assert.notEqual(dayKey(new Date(2026, 9, 23)), dayKey(new Date(2026, 9, 24)))
})

test('formatLastSeen', () => {
  const now = new Date(2026, 9, 23, 15, 0)

  assert.equal(formatLastSeen(null, now), 'offline')
  assert.match(formatLastSeen(new Date(2026, 9, 23, 9, 5), now), /^visto hoje às 09:05$/)
  assert.equal(formatLastSeen(new Date(2026, 9, 22, 9, 5), now), 'visto ontem')
})

test('messagePreview: texto, "📷 Foto" para imagem, nome para outros arquivos', () => {
  assert.equal(messagePreview(null), '')
  assert.equal(messagePreview({ body: 'oi' }), 'oi')
  assert.equal(messagePreview({ body: null, file: { name: 'a.png', is_image: true } }), '📷 Foto')
  assert.equal(messagePreview({ body: null, file: { name: 'r.pdf', is_image: false } }), '📎 r.pdf')
  assert.equal(messagePreview({ is_deleted: true, body: null }), 'Mensagem apagada')
})
