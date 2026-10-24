import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cropArea, moveCrop } from '../../src/components/user/photoCrop.js'

test('enquadramento inicial cobre o círculo sem distorcer imagens horizontais ou verticais', () => {
  assert.deepEqual(cropArea(600, 400), {
    x: 100,
    y: 0,
    size: 400,
    centerX: 300,
    centerY: 200,
    zoom: 1,
  })
  assert.deepEqual(cropArea(400, 600), {
    x: 0,
    y: 100,
    size: 400,
    centerX: 200,
    centerY: 300,
    zoom: 1,
  })
})
test('zoom e arraste preservam limites da imagem, sem espaço vazio no avatar', () => {
  for (const [width, height] of [
    [600, 400],
    [400, 600],
    [100, 100],
  ]) {
    for (const zoom of [0, 1, 2, 4, 99]) {
      for (const delta of [-10000, -30, 0, 30, 10000]) {
        const state = { zoom, x: width / 2, y: height / 2 }
        const area = moveCrop(width, height, state, delta, delta, 272)
        assert.ok(area.zoom >= 1 && area.zoom <= 4)
        assert.ok(area.x >= 0 && area.y >= 0)
        assert.ok(area.x + area.size <= width && area.y + area.size <= height)
      }
    }
  }
})
test('deslocamento é proporcional à prévia e pode ser retomado para editar o mesmo recorte', () => {
  const result = moveCrop(600, 400, { zoom: 2, x: 300, y: 200 }, -136, 0, 272)
  assert.equal(result.centerX, 400)
  assert.equal(result.x, 300)
  assert.equal(result.size, 200)
  assert.deepEqual(
    cropArea(600, 400, { zoom: result.zoom, x: result.centerX, y: result.centerY }),
    result,
  )
})
