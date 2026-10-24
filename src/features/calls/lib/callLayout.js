// Grade da sala no estilo do Meet: escolhe colunas e linhas que deixam cada quadro (16:9) o maior
// possível dentro da área visível, sem rolagem. Retorna o tamanho em px de cada quadro.
export function fitTiles(count, { width, height, gap = 0 }, ratio = 16 / 9) {
  if (count < 1 || width <= 0 || height <= 0) return { cols: 1, rows: 1, width: 0, height: 0 }

  let best = { cols: 1, rows: count, width: 0, height: 0 }
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols)
    const maxWidth = (width - (cols - 1) * gap) / cols
    const maxHeight = (height - (rows - 1) * gap) / rows
    const tileWidth = Math.min(maxWidth, maxHeight * ratio)
    if (tileWidth > best.width) best = { cols, rows, width: tileWidth, height: tileWidth / ratio }
  }
  return {
    ...best,
    width: Math.floor(best.width),
    height: Math.floor(best.height),
  }
}
