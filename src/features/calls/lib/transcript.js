// Regras da transcrição das reuniões (sem Vue nem navegador: testável com node --test).

const TURN_GAP_MS = 45_000 // falas seguidas da mesma pessoa dentro desse intervalo viram um bloco só

/** Instante dentro da reunião: 65000 → "01:05"; 3725000 → "1:02:05". */
export function formatOffset(ms) {
  const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n) => String(n).padStart(2, '0')

  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/** Fala vinda da API/WebSocket, só com os campos conhecidos; null se não servir. */
export function normalizeSegment(raw) {
  if (!raw || typeof raw !== 'object') return null

  const id = Number(raw.id)
  const text = typeof raw.text === 'string' ? raw.text.trim() : ''

  if (!Number.isFinite(id) || !text) return null

  return {
    id,
    user: raw.user ?? null,
    name: typeof raw.name === 'string' && raw.name ? raw.name : 'Participante',
    text,
    offset_ms: Math.max(0, Number(raw.offset_ms) || 0),
  }
}

const byTime = (a, b) => a.offset_ms - b.offset_ms || a.id - b.id

/** Junta falas novas à lista (sem repetir ids, em ordem de tempo). Não altera a lista recebida. */
export function mergeSegments(current, incoming) {
  const known = new Map(current.map((segment) => [segment.id, segment]))

  for (const raw of incoming) {
    const segment = normalizeSegment(raw)

    if (segment && !known.has(segment.id)) known.set(segment.id, segment)
  }

  return [...known.values()].sort(byTime)
}

/** Agrupa falas seguidas da mesma pessoa em blocos: [{ key, user, name, offset_ms, texts: [...] }]. */
export function groupTurns(segments, gapMs = TURN_GAP_MS) {
  const turns = []

  for (const segment of segments) {
    const last = turns[turns.length - 1]

    if (last && last.user === segment.user && segment.offset_ms - last.endMs <= gapMs) {
      last.texts.push(segment.text)
      last.endMs = segment.offset_ms
    } else {
      turns.push({
        key: segment.id,
        user: segment.user,
        name: segment.name,
        offset_ms: segment.offset_ms,
        endMs: segment.offset_ms,
        texts: [segment.text],
      })
    }
  }

  return turns
}

/** Texto para baixar. `format`: 'txt' (padrão) ou 'md'. Inclui o resumo, quando houver. */
export function toDocument(call, segments, { format = 'txt', summary = '' } = {}) {
  const turns = groupTurns(segments)
  const title = call?.title || 'Reunião'
  const markdown = format === 'md'
  const lines = [markdown ? `# ${title}` : title]

  if (call?.project_name)
    lines.push(markdown ? `Projeto: **${call.project_name}**` : `Projeto: ${call.project_name}`)

  if (call?.started_at) lines.push(`Início: ${new Date(call.started_at).toLocaleString('pt-BR')}`)

  if (summary) lines.push('', markdown ? '## Resumo' : 'RESUMO', summary.trim())

  lines.push('', markdown ? '## Transcrição' : 'TRANSCRIÇÃO', '')

  if (!turns.length) lines.push('(sem falas transcritas)')

  for (const turn of turns) {
    const head = `[${formatOffset(turn.offset_ms)}] ${turn.name}`

    lines.push(markdown ? `**${head}**` : head, turn.texts.join(' '), '')
  }

  return `${lines.join('\n').trimEnd()}\n`
}

/** Nome de arquivo seguro: "Reunião do projeto" → "transcricao-reuniao-do-projeto.txt". */
export function downloadName(call, format = 'txt') {
  const slug = (call?.title || 'reuniao')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  return `transcricao-${slug || 'reuniao'}.${format === 'md' ? 'md' : 'txt'}`
}

/** Resumo curto de uma reunião encerrada para a lista: "12 falas · com resumo". */
export function transcriptBadge(call) {
  const count = Number(call?.segments_count) || 0

  if (!count) return ''

  return `${count} ${count === 1 ? 'fala' : 'falas'}${call.has_summary ? ' · com resumo' : ''}`
}
