// O resumo da IA vem em Markdown simples (títulos "##", listas "-" e parágrafos). Aqui vira blocos de dados
// para o Vue desenhar com segurança, sem HTML cru (v-html): nada do texto da IA é interpretado como marcação.

const stripInline = (text) => text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1')

/** "## Tarefas\n- Ana: revisar\n\nTexto" → [{ type: 'heading', text }, { type: 'item', text }, { type: 'text', text }] */
export function summaryBlocks(markdown) {
  const blocks = []

  for (const raw of String(markdown ?? '').split(/\r?\n/)) {
    const line = raw.trim()

    if (!line) continue

    const heading = line.match(/^#{1,6}\s+(.*)$/)
    const item = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/)

    if (heading) blocks.push({ type: 'heading', text: stripInline(heading[1]) })
    else if (item) blocks.push({ type: 'item', text: stripInline(item[1]) })
    else blocks.push({ type: 'text', text: stripInline(line) })
  }

  return blocks
}
