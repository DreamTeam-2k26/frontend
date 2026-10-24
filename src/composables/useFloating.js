import { nextTick, onBeforeUnmount, reactive, shallowRef } from 'vue'

const GAP = 6
const MARGIN = 8

/**
 * Posiciona um elemento flutuante (menu, listbox, popover) junto ao gatilho, com `position: fixed`.
 * Fica fora de qualquer `overflow`/stacking context: o conteúdo é teleportado para o `<dialog>` aberto
 * que contém o gatilho (camada superior) ou para o `body`.
 * @param {import('vue').Ref<HTMLElement|null>} triggerRef
 * @param {import('vue').Ref<HTMLElement|null>} floatingRef
 * @param {{ align?: 'start'|'end', side?: 'bottom'|'right', onDismiss?: () => void }} options
 *   onDismiss: chamado quando a página rola por fora do flutuante (fecha, como os menus nativos).
 */
export function useFloating(
  triggerRef,
  floatingRef,
  { align = 'start', side = 'bottom', onDismiss } = {},
) {
  const open = shallowRef(false)
  const teleportTo = shallowRef('body')
  const style = reactive({ top: '0px', left: '0px', minWidth: '0px', visibility: 'hidden' })

  function update() {
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
    } else {
      const below = rect.bottom + GAP
      top =
        below + height > innerHeight - MARGIN && rect.top - GAP - height > MARGIN
          ? rect.top - GAP - height
          : below
      left = align === 'end' ? rect.right - width : rect.left
    }
    left = Math.min(Math.max(left, MARGIN), innerWidth - width - MARGIN)
    top = Math.min(Math.max(top, MARGIN), innerHeight - height - MARGIN)

    Object.assign(style, {
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      minWidth: side === 'bottom' ? `${Math.round(rect.width)}px` : '0px',
      visibility: 'visible',
    })
  }

  // Rolar a página (fora do flutuante) fecha; rolar dentro da lista não. Redimensionar reposiciona.
  function onScroll(event) {
    if (floatingRef.value?.contains(event.target)) return
    if (onDismiss) onDismiss()
    else update()
  }
  const onResize = () => update()

  async function show() {
    teleportTo.value = triggerRef.value?.closest('dialog[open]') ?? 'body'
    style.visibility = 'hidden'
    open.value = true
    await nextTick()
    update()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
  }

  function hide() {
    open.value = false
    window.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('resize', onResize)
  }

  onBeforeUnmount(hide)

  return { open, style, teleportTo, show, hide, update }
}
