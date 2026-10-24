// Coordena a camada de marca do Fluxo (abertura, entrada autenticada e logout).
// Só cuida da ordem das etapas; quem anima é a camada registrada em attach() (BrandTransition.vue).

// Marcador da apresentação nesta aba, separado dos tokens de sessão.
export const INTRO_KEY = 'fluxo-intro-seen'

// Tempo máximo que a marca espera a rota inicial depois de tocar: a logo não simula progresso de rede.
export const INTRO_ROUTE_LIMIT = 1500

export function introVariant({ seen, reduced }) {
  if (reduced) return 'reduced'
  return seen ? 'short' : 'full'
}

const defaultWait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function readSeen(storage) {
  try {
    return storage?.getItem(INTRO_KEY) === '1'
  } catch {
    return false
  }
}

function markSeen(storage) {
  try {
    storage?.setItem(INTRO_KEY, '1')
  } catch {
    // Storage bloqueado: a próxima visita repete a abertura completa.
  }
}

export function createTransitionCoordinator({
  state,
  isReduced = () => false,
  storage = null,
  wait = defaultWait,
}) {
  // A camada nasce visível: a primeira pintura já mostra a marca, sem flash da rota.
  Object.assign(state, { visible: true, stage: 'intro', busy: false })

  let layer = null
  // Cada etapa nova invalida a anterior: callbacks antigos não mexem na camada atual.
  let token = 0
  let current = null

  async function play(name, ...args) {
    if (!layer || isReduced()) return
    try {
      await layer[name]?.(...args)
    } catch {
      // Animação interrompida ou com erro: segue o fluxo sem prender a tela.
    }
  }

  async function finish(id) {
    if (id !== token) return
    state.stage = 'reveal'
    await play('reveal')
    if (id === token) Object.assign(state, { visible: false, stage: null, busy: false })
  }

  function attach(handlers) {
    layer = handlers
    return () => {
      if (layer === handlers) layer = null
    }
  }

  async function intro(ready) {
    const id = ++token
    const variant = introVariant({ seen: readSeen(storage), reduced: isReduced() })
    Object.assign(state, { visible: true, stage: 'intro' })
    const routeReady = Promise.race([
      Promise.resolve(ready).then(
        () => {},
        () => {},
      ),
      wait(INTRO_ROUTE_LIMIT),
    ])
    await Promise.all([play('intro', variant), routeReady])
    markSeen(storage)
    await finish(id)
  }

  // Cobre a tela, executa a troca (navegação, logout) e revela o destino.
  function cover(task) {
    if (current) return current
    const id = ++token
    Object.assign(state, { visible: true, stage: 'cover', busy: true })
    current = (async () => {
      try {
        await play('cover')
        return await task()
      } finally {
        current = null
        await finish(id)
      }
    })()
    return current
  }

  return { attach, intro, cover }
}
