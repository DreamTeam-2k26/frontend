import assert from 'node:assert/strict'
import { test } from 'node:test'

import { MAX_SIDE, fitWithin, jpegName, shouldCompress } from '../lib/image.js'

const file = (type, size) => ({ type, size })
const KB = 1024

test('shouldCompress: só fotos grandes em formato que o canvas redesenha', () => {
  assert.equal(shouldCompress(file('image/jpeg', 3000 * KB)), true)
  assert.equal(shouldCompress(file('image/png', 2000 * KB)), true)
  assert.equal(shouldCompress(file('image/webp', 900 * KB)), true)
})

test('shouldCompress: mantém foto pequena, GIF (animação) e o que não é imagem', () => {
  assert.equal(shouldCompress(file('image/jpeg', 200 * KB)), false)
  assert.equal(shouldCompress(file('image/gif', 5000 * KB)), false)
  assert.equal(shouldCompress(file('application/pdf', 5000 * KB)), false)
  assert.equal(shouldCompress(file('', 5000 * KB)), false)
})

test('fitWithin: reduz o lado maior até o limite mantendo a proporção', () => {
  assert.deepEqual(fitWithin(4000, 3000), { width: MAX_SIDE, height: 1200 })
  assert.deepEqual(fitWithin(3000, 4000), { width: 1200, height: MAX_SIDE })
})

test('fitWithin: não amplia imagem menor que o limite', () => {
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 })
})

test('jpegName: troca a extensão por .jpg', () => {
  assert.equal(jpegName('IMG_20261026.png'), 'IMG_20261026.jpg')
  assert.equal(jpegName('foto.da.festa.webp'), 'foto.da.festa.jpg')
  assert.equal(jpegName('camera'), 'camera.jpg')
  assert.equal(jpegName(''), 'foto.jpg')
})
