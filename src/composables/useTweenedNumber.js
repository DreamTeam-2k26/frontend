import { onBeforeUnmount, shallowRef, watch } from 'vue'
import { animate } from 'motion-v'
import { EASE, prefersReducedMotion } from '@/utils/motion'

// Número exibido que desliza do valor anterior para o novo quando a API atualiza.
// Na montagem já mostra o valor real (nunca conta do zero); valores ausentes (null) trocam na hora.
export function useTweenedNumber(source, { duration = 0.5 } = {}) {
  const display = shallowRef(source())
  let running = null

  watch(source, (next, previous) => {
    running?.stop()
    running = null
    if (!Number.isFinite(next) || !Number.isFinite(previous) || prefersReducedMotion()) {
      display.value = next
      return
    }
    running = animate(display.value ?? previous, next, {
      duration,
      ease: EASE.flow,
      onUpdate: (value) => {
        display.value = Math.round(value)
      },
      onComplete: () => {
        display.value = next
      },
    })
  })

  onBeforeUnmount(() => running?.stop())
  return display
}
