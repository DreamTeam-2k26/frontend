import { onBeforeUnmount, reactive } from 'vue'

const MOUSE_THRESHOLD = 6 // px antes de virar arrasto (clique continua sendo clique)
const TOUCH_DELAY = 250 // ms de toque longo, para não brigar com a rolagem
const TOUCH_TOLERANCE = 8 // px de movimento que cancela o toque longo
const EDGE = 56 // px perto da borda que ativam a rolagem automática
const SCROLL_STEP = 14

/**
 * Arrasto de cards entre colunas com Pointer Events (mouse, toque e caneta), sem biblioteca.
 * Marcação esperada: card com `data-task-id`, faixa com `data-lane-id`, controles que não
 * iniciam arrasto com `data-no-drag`.
 * @param {import('vue').Ref<HTMLElement|null>} boardRef elemento com rolagem horizontal
 * @param {{ onDrop: (taskId: number, laneId: string, index: number) => void }} options
 *   index = posição de inserção entre os cards visíveis da faixa, sem contar o card arrastado.
 */
export function useBoardDrag(boardRef, { onDrop }) {
  const drag = reactive({ taskId: null, laneId: null, index: null })

  let pending = null // { taskId, card, pointerId, startX, startY, timer }
  let ghost = null
  let offset = { x: 0, y: 0 }
  let pointer = { x: 0, y: 0 }
  let frame = 0

  function reset() {
    clearTimeout(pending?.timer)
    pending?.card.classList.remove('task-card--dragging')
    pending = null
    ghost?.remove()
    ghost = null
    cancelAnimationFrame(frame)
    frame = 0
    Object.assign(drag, { taskId: null, laneId: null, index: null })
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onUp)
    document.removeEventListener('pointercancel', onCancel)
    document.removeEventListener('keydown', onKeydown, true)
    document.removeEventListener('touchmove', blockTouchScroll)
    document.body.classList.remove('is-dragging')
  }

  function start() {
    const { card, taskId } = pending
    const rect = card.getBoundingClientRect()
    offset = { x: pointer.x - rect.left, y: pointer.y - rect.top }

    ghost = card.cloneNode(true)
    ghost.removeAttribute('data-task-id')
    ghost.setAttribute('aria-hidden', 'true')
    ghost.classList.add('task-card--ghost')
    Object.assign(ghost.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: `${rect.width}px`,
      zIndex: '1000',
      pointerEvents: 'none',
    })
    document.body.appendChild(ghost)

    card.classList.add('task-card--dragging')
    document.body.classList.add('is-dragging')
    drag.taskId = taskId
    navigator.vibrate?.(10)
    update()
    frame = requestAnimationFrame(autoScroll)
  }

  // Faixa e índice sob o ponteiro.
  function update() {
    ghost.style.transform = `translate(${pointer.x - offset.x}px, ${pointer.y - offset.y}px) rotate(2deg)`

    const lane = document.elementFromPoint(pointer.x, pointer.y)?.closest('[data-lane-id]')
    if (!lane || !boardRef.value?.contains(lane)) {
      Object.assign(drag, { laneId: null, index: null })
      return
    }
    const cards = [...lane.querySelectorAll('[data-task-id]')].filter(
      (element) => Number(element.dataset.taskId) !== drag.taskId,
    )
    const index = cards.findIndex((element) => {
      const rect = element.getBoundingClientRect()
      return pointer.y < rect.top + rect.height / 2
    })
    drag.laneId = lane.dataset.laneId
    drag.index = index === -1 ? cards.length : index
  }

  function autoScroll() {
    const board = boardRef.value
    if (board) {
      const rect = board.getBoundingClientRect()
      if (pointer.x < rect.left + EDGE) board.scrollLeft -= SCROLL_STEP
      else if (pointer.x > rect.right - EDGE) board.scrollLeft += SCROLL_STEP
    }
    if (pointer.y < EDGE) window.scrollBy(0, -SCROLL_STEP)
    else if (pointer.y > window.innerHeight - EDGE) window.scrollBy(0, SCROLL_STEP)
    if (ghost) update()
    frame = requestAnimationFrame(autoScroll)
  }

  function onPointerDown(event) {
    if (event.button !== 0 || pending) return
    const card = event.target.closest('[data-task-id]')
    if (!card || event.target.closest('[data-no-drag]')) return

    pointer = { x: event.clientX, y: event.clientY }
    pending = {
      card,
      taskId: Number(card.dataset.taskId),
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      touch: event.pointerType !== 'mouse',
      timer: null,
    }
    if (pending.touch) {
      pending.timer = setTimeout(start, TOUCH_DELAY)
      document.addEventListener('touchmove', blockTouchScroll, { passive: false })
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onCancel)
    document.addEventListener('keydown', onKeydown, true)
  }

  function onMove(event) {
    if (event.pointerId !== pending?.pointerId) return
    pointer = { x: event.clientX, y: event.clientY }
    const distance = Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY)

    if (!ghost) {
      // Toque que se move antes do tempo é rolagem: desiste do arrasto.
      if (pending.touch) {
        if (distance > TOUCH_TOLERANCE) reset()
        return
      }
      if (distance < MOUSE_THRESHOLD) return
      start()
    }
    event.preventDefault()
    update()
  }

  function onUp(event) {
    if (event.pointerId !== pending?.pointerId) return
    if (ghost) {
      suppressNextClick()
      const { taskId, laneId, index } = drag
      reset()
      if (laneId != null) onDrop(taskId, laneId, index)
      return
    }
    reset()
  }

  // Durante o arrasto por toque, a página não rola junto.
  function blockTouchScroll(event) {
    if (ghost) event.preventDefault()
  }

  function onCancel() {
    reset()
  }

  function onKeydown(event) {
    if (event.key !== 'Escape' || !ghost) return
    event.preventDefault()
    event.stopPropagation()
    reset()
  }

  // Soltar o card não pode abrir a tarefa (o clique dispara depois do pointerup).
  function suppressNextClick() {
    const stop = (event) => {
      event.stopPropagation()
      event.preventDefault()
    }
    document.addEventListener('click', stop, { capture: true, once: true })
    setTimeout(() => document.removeEventListener('click', stop, { capture: true }), 0)
  }

  onBeforeUnmount(reset)

  return { drag, onPointerDown }
}
