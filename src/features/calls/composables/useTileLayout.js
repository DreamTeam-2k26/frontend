import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { fitTiles } from '../lib/callLayout'

// Mede a área útil do palco (sem padding) e calcula o tamanho dos quadros para caberem sem rolar.
export function useTileLayout(stage, count) {
  const box = shallowRef({ width: 0, height: 0, gap: 0 })
  let observer = null

  function measure() {
    const element = stage.value
    if (!element) return
    const style = getComputedStyle(element)
    const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
    const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
    box.value = {
      width: element.clientWidth - padX,
      height: element.clientHeight - padY,
      gap: parseFloat(style.columnGap) || 0,
    }
  }

  onMounted(() => {
    measure()
    observer = new ResizeObserver(measure)
    if (stage.value) observer.observe(stage.value)
  })
  onBeforeUnmount(() => observer?.disconnect())

  const layout = computed(() => fitTiles(count.value, box.value))
  return { layout, gap: computed(() => box.value.gap) }
}
