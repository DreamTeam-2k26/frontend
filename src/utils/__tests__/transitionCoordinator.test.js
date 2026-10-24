import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { INTRO_KEY, createTransitionCoordinator, introVariant } from '../transitionCoordinator.js'

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value)
    },
  }
}

// Camada falsa: registra a ordem das etapas e resolve na hora.
function fakeLayer(log) {
  return {
    intro: async (variant) => log.push(`intro:${variant}`),
    cover: async () => log.push('cover'),
    reveal: async () => log.push('reveal'),
  }
}

function setup({ reduced = false, storage = memoryStorage(), wait } = {}) {
  const state = {}
  const coordinator = createTransitionCoordinator({
    state,
    isReduced: () => reduced,
    storage,
    wait: wait ?? (() => new Promise(() => {})),
  })
  return { state, coordinator, storage }
}

describe('introVariant', () => {
  test('primeira visita da aba recebe a abertura completa', () => {
    assert.equal(introVariant({ seen: false, reduced: false }), 'full')
  })
  test('recarregar na mesma aba usa a versão curta', () => {
    assert.equal(introVariant({ seen: true, reduced: false }), 'short')
  })
  test('movimento reduzido sempre usa a revelação simples', () => {
    assert.equal(introVariant({ seen: false, reduced: true }), 'reduced')
  })
})

describe('createTransitionCoordinator', () => {
  test('começa com a camada visível para não piscar a rota antes da logo', () => {
    const { state } = setup()
    assert.equal(state.visible, true)
    assert.equal(state.stage, 'intro')
  })

  test('abertura completa toca, revela e marca a aba como vista', async () => {
    const log = []
    const { state, coordinator, storage } = setup()
    coordinator.attach(fakeLayer(log))
    await coordinator.intro(Promise.resolve())
    assert.deepEqual(log, ['intro:full', 'reveal'])
    assert.equal(storage.data[INTRO_KEY], '1')
    assert.equal(state.visible, false)
    assert.equal(state.stage, null)
  })

  test('segunda abertura na mesma aba usa a versão curta', async () => {
    const log = []
    const { coordinator } = setup({ storage: memoryStorage({ [INTRO_KEY]: '1' }) })
    coordinator.attach(fakeLayer(log))
    await coordinator.intro(Promise.resolve())
    assert.deepEqual(log, ['intro:short', 'reveal'])
  })

  test('storage bloqueado não impede a abertura', async () => {
    const log = []
    const blocked = {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => {
        throw new Error('bloqueado')
      },
    }
    const { state, coordinator } = setup({ storage: blocked })
    coordinator.attach(fakeLayer(log))
    await coordinator.intro(Promise.resolve())
    assert.deepEqual(log, ['intro:full', 'reveal'])
    assert.equal(state.visible, false)
  })

  test('movimento reduzido remove a camada sem tocar animações', async () => {
    const log = []
    const { state, coordinator } = setup({ reduced: true })
    coordinator.attach(fakeLayer(log))
    await coordinator.intro(Promise.resolve())
    assert.deepEqual(log, [])
    assert.equal(state.visible, false)
  })

  test('falha ao carregar a rota ainda remove a camada', async () => {
    const log = []
    const { state, coordinator } = setup()
    coordinator.attach(fakeLayer(log))
    await coordinator.intro(Promise.reject(new Error('chunk')))
    assert.equal(state.visible, false)
    assert.deepEqual(log, ['intro:full', 'reveal'])
  })

  test('rota que demora libera a marca no limite em vez de prender a tela', async () => {
    const log = []
    let release
    const { state, coordinator } = setup({
      wait: () =>
        new Promise((resolve) => {
          release = resolve
        }),
    })
    coordinator.attach(fakeLayer(log))
    const running = coordinator.intro(new Promise(() => {}))
    await Promise.resolve()
    release()
    await running
    assert.equal(state.visible, false)
  })

  test('animação que falha não prende a camada', async () => {
    const { state, coordinator } = setup()
    coordinator.attach({
      intro: async () => {
        throw new Error('animação')
      },
      reveal: async () => {},
    })
    await coordinator.intro(Promise.resolve())
    assert.equal(state.visible, false)
  })

  test('cobertura cobre, executa a troca e revela', async () => {
    const log = []
    const { state, coordinator } = setup()
    coordinator.attach(fakeLayer(log))
    await coordinator.intro(Promise.resolve())
    log.length = 0

    const result = await coordinator.cover(async () => {
      log.push(`task:${state.visible}`)
      return 'ok'
    })
    assert.equal(result, 'ok')
    assert.deepEqual(log, ['cover', 'task:true', 'reveal'])
    assert.equal(state.visible, false)
    assert.equal(state.busy, false)
  })

  test('cliques repetidos reaproveitam a mesma cobertura', async () => {
    const { coordinator } = setup()
    coordinator.attach(fakeLayer([]))
    await coordinator.intro(Promise.resolve())
    let runs = 0
    const task = async () => {
      runs++
    }
    const first = coordinator.cover(task)
    const second = coordinator.cover(task)
    assert.equal(first, second)
    await first
    assert.equal(runs, 1)
  })

  test('erro na troca revela, libera e repassa o erro', async () => {
    const log = []
    const { state, coordinator } = setup()
    coordinator.attach(fakeLayer(log))
    await coordinator.intro(Promise.resolve())
    log.length = 0

    await assert.rejects(
      coordinator.cover(async () => {
        throw new Error('navegação')
      }),
      /navegação/,
    )
    assert.deepEqual(log, ['cover', 'reveal'])
    assert.equal(state.visible, false)
    assert.equal(state.busy, false)
  })

  test('cobertura durante a abertura assume a camada; a abertura antiga não a esconde', async () => {
    const log = []
    let finishIntro
    const { state, coordinator } = setup()
    coordinator.attach({
      ...fakeLayer(log),
      intro: () =>
        new Promise((resolve) => {
          finishIntro = resolve
        }),
    })
    const intro = coordinator.intro(Promise.resolve())
    let finishTask
    const cover = coordinator.cover(
      () =>
        new Promise((resolve) => {
          finishTask = resolve
        }),
    )
    finishIntro()
    await intro
    assert.equal(state.visible, true, 'abertura antiga não pode remover a cobertura')
    await new Promise((resolve) => setTimeout(resolve, 0))
    finishTask()
    await cover
    assert.equal(state.visible, false)
  })

  test('camada desmontada vira no-op e o fluxo segue', async () => {
    const log = []
    const { state, coordinator } = setup()
    const detach = coordinator.attach(fakeLayer(log))
    detach()
    await coordinator.intro(Promise.resolve())
    await coordinator.cover(async () => {})
    assert.deepEqual(log, [])
    assert.equal(state.visible, false)
  })
})
