import { nextTick, onBeforeUnmount, reactive, shallowRef } from 'vue'

const GAP = 6
const MARGIN = 8

// O gatilho ainda aparece dentro dos contêineres com rolagem (quadro, corpo do painel)?
function visibleInScrollParents(element, rect) {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(parent)
    if (overflowX === 'visible' && overflowY === 'visible') continue
    const box = parent.getBoundingClientRect()
    if (rect.right <= box.left || rect.left >= box.right) return false
    if (rect.bottom <= box.top || rect.top >= box.bottom) return false
  }
  return true
}

/**
 * Posiciona um elemento flutuante (menu, listbox, popover) junto ao gatilho, com `position: fixed`.
 * Fica fora de qualquer `overflow`/stacking context: o conteúdo é teleportado para o `<dialog>` aberto
 * que contém o gatilho (camada superior) ou para o `body`.
 * Ao rolar a página ele continua aberto e acompanha o gatilho (passa por baixo do cabeçalho fixo).
 * @param {import('vue').Ref<HTMLElement|null>} triggerRef
 * @param {import('vue').Ref<HTMLElement|null>} floatingRef
 * @param {{ align?: 'start'|'end', side?: 'bottom'|'right' }} options
 */
export function useFloating(triggerRef, floatingRef, { align = 'start', side = 'bottom' } = {}) {
  const open = shallowRef(false)
  const teleportTo = shallowRef('body')
  const style = reactive({ top: '0px', left: '0px', minWidth: '0px', visibility: 'hidden' })
  // Abaixo ou acima do gatilho: decidido ao abrir (onde houver espaço) e mantido ao rolar.
  let above = false

  function update(choosePlacement = false) {
    const trigger = triggerRef.value
    const floating = floatingRef.value
    if (!trigger || !floating) return
    const rect = trigger.getBoundingClientRect()
    const width = floating.offsetWidth
    const height = floating.offsetHeight
    const { innerWidth, innerHeight } = window

    let top
    let left
    if (side === 'right') {
      left = rect.right + 2
      if (left + width > innerWidth - MARGIN) left = rect.left - width - 2
      top = rect.top - 4
      if (choosePlacement) above = top + height > innerHeight - MARGIN
      if (above) top = Math.max(MARGIN, rect.bottom + 4 - height)
    } else {
      if (choosePlacement) {
        above =
          rect.bottom + GAP + height > innerHeight - MARGIN && rect.top - GAP - height > MARGIN
      }
      top = above ? rect.top - GAP - height : rect.bottom + GAP
      left = align === 'end' ? rect.right - width : rect.left
    }
    left = Math.min(Math.max(left, MARGIN), innerWidth - width - MARGIN)

    Object.assign(style, {
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      minWidth: side === 'bottom' ? `${Math.round(rect.width)}px` : '0px',
      // Gatilho rolou para fora do quadro/painel: o flutuante some junto (continua aberto).
      visibility: visibleInScrollParents(trigger, rect) ? 'visible' : 'hidden',
    })
  }

  // Rolar a página ou um contêiner (quadro, painel) leva o flutuante junto; rolar dentro dele não.
  function onScroll(event) {
    if (floatingRef.value?.contains(event.target)) return
    update()
  }
  const onResize = () => update()

  async function show() {
    teleportTo.value = triggerRef.value?.closest('dialog[open]') ?? 'body'
    style.visibility = 'hidden'
    open.value = true
    await nextTick()
    update(true)
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('resize', onResize)
  }

  function hide() {
    open.value = false
    window.removeEventListener('scroll', onScroll, { capture: true })
    window.removeEventListener('resize', onResize)
  }

  onBeforeUnmount(hide)

  return { open, style, teleportTo, show, hide, update }
}
