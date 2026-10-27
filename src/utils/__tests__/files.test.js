import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { MAX_UPLOAD_MB, fileKind, formatBytes, toMemoryFile, uploadError } from '../files.js'

describe('fileKind', () => {
  test('pela extensão', () => {
    assert.equal(fileKind('Apresentação.pdf'), 'pdf')
    assert.equal(fileKind('foto.JPG'), 'image')
    assert.equal(fileKind('relatorio.docx'), 'doc')
    assert.equal(fileKind('notas.xlsx'), 'sheet')
    assert.equal(fileKind('slides.pptx'), 'slides')
    assert.equal(fileKind('leia.md'), 'text')
  })
  test('sem extensão conhecida', () => assert.equal(fileKind('arquivo'), 'other'))
})

describe('formatBytes', () => {
  test('bytes, KB e MB em pt-BR', () => {
    assert.equal(formatBytes(512), '512 B')
    assert.equal(formatBytes(1536), '1,5 KB')
    assert.equal(formatBytes(2.4 * 1024 * 1024), '2,4 MB')
  })
  test('valor inválido', () => assert.equal(formatBytes(undefined), ''))
})

describe('uploadError', () => {
  const file = (name, size = 1000) => ({ name, size })
  test('aceita tipo permitido dentro do limite', () => assert.equal(uploadError(file('a.pdf')), ''))
  test('recusa tipo fora da lista', () =>
    assert.match(uploadError(file('virus.exe')), /Tipo de arquivo não permitido/))
  test('recusa acima do limite', () =>
    assert.match(
      uploadError(file('grande.pdf', (MAX_UPLOAD_MB + 1) * 1024 * 1024)),
      new RegExp(`${MAX_UPLOAD_MB} MB`),
    ))
  test('recusa arquivo vazio', () => assert.match(uploadError(file('vazio.txt', 0)), /vazio/))
})

describe('toMemoryFile', () => {
  test('cópia em memória com mesmo nome, tipo e conteúdo', async () => {
    const original = new File(['foto'], 'camera.jpg', { type: 'image/jpeg', lastModified: 123 })
    const copy = await toMemoryFile(original)

    assert.notEqual(copy, original)
    assert.equal(copy.name, 'camera.jpg')
    assert.equal(copy.type, 'image/jpeg')
    assert.equal(copy.lastModified, 123)
    assert.equal(await copy.text(), 'foto')
  })
})
