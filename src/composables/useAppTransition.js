import { computed, reactive } from 'vue'
import { createTransitionCoordinator } from '@/utils/transitionCoordinator'

function safeSessionStorage() {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

// Lido a cada etapa: a regra CSS de movimento reduzido não cancela as esperas do JavaScript.
export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

// Instância única: App.vue monta a camada e as telas de login/perfil pedem a cobertura.
const state = reactive({})
const coordinator = createTransitionCoordinator({
  state,
  isReduced: prefersReducedMotion,
  storage: safeSessionStorage(),
})

const visible = computed(() => state.visible)
const stage = computed(() => state.stage)
const busy = computed(() => state.busy)
// Conteúdo pode animar a própria entrada quando a camada sai (ou já saiu).
const contentReady = computed(() => !state.visible || state.stage === 'reveal')

export function useAppTransition() {
  return {
    visible,
    stage,
    busy,
    contentReady,
    attach: coordinator.attach,
    intro: coordinator.intro,
    cover: coordinator.cover,
  }
}
