import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fitTiles } from '../lib/callLayout.js'

// Área útil típica da sala no desktop (1920×1080 sem header/controles).
const DESKTOP = { width: 1880, height: 680, gap: 12 }

function fits({ cols, rows, width, height }, { width: W, height: H, gap }) {
  return cols * width + (cols - 1) * gap <= W + 0.5 && rows * height + (rows - 1) * gap <= H + 0.5
}

test('duas pessoas ficam lado a lado e cabem na área', () => {
  const layout = fitTiles(2, DESKTOP)
  assert.equal(layout.cols, 2)
  assert.equal(layout.rows, 1)
  assert.ok(fits(layout, DESKTOP))
})

test('três ou mais pessoas cabem sem rolagem (estilo Meet)', () => {
  for (const count of [3, 4, 5, 6, 9, 12]) {
    const layout = fitTiles(count, DESKTOP)
    assert.ok(layout.cols * layout.rows >= count, `${count}: grade com vagas suficientes`)
    assert.ok(fits(layout, DESKTOP), `${count}: cabe na área sem rolar`)
  }
})

test('três pessoas numa tela larga usam uma linha só (quadros maiores que em 2×2)', () => {
  const layout = fitTiles(3, DESKTOP)
  assert.equal(layout.rows, 1)
  assert.equal(layout.cols, 3)
})

test('quadros mantêm a proporção 16:9', () => {
  const layout = fitTiles(4, DESKTOP)
  assert.ok(Math.abs(layout.width / layout.height - 16 / 9) < 0.01)
})

test('área sem medida ou ninguém na sala não quebra', () => {
  assert.deepEqual(fitTiles(0, DESKTOP), { cols: 1, rows: 1, width: 0, height: 0 })
  assert.equal(fitTiles(3, { width: 0, height: 0, gap: 12 }).width, 0)
})
