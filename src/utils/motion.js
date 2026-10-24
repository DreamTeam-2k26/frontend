// Durações (segundos, formato da motion-v) e curvas espelhando os tokens de movimento do main.css.
export const MOTION = {
  fast: 0.12,
  quick: 0.18,
  base: 0.22,
  slow: 0.28,
}

// Lido na hora: a regra CSS de movimento reduzido não cancela esperas e animações do JavaScript.
export function prefersReducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export const EASE = {
  flow: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  exit: [0.4, 0, 1, 1],
}

// Itens de lista/grade (motion.li dentro de AnimatePresence): entrada curta com atraso só nos
// primeiros itens, saída rápida e reorganização por layout. Listas grandes não acumulam atraso.
const STAGGER_LIMIT = 6

export function listItemMotion(index) {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.97, transition: { duration: MOTION.quick, ease: EASE.exit } },
    transition: {
      duration: MOTION.slow,
      ease: EASE.flow,
      delay: Math.min(index, STAGGER_LIMIT) * 0.04,
      layout: { duration: MOTION.slow, ease: EASE.flow },
    },
  }
}
