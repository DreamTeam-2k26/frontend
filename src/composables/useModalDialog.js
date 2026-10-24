import { onBeforeUnmount, onMounted } from 'vue'
import { prefersReducedMotion } from '@/utils/motion'

// Tempo máximo da saída caso o navegador não dispare animationend (aba em segundo plano).
const EXIT_FALLBACK = 400

// O clone começa com os campos do HTML original: copia o que a pessoa digitou ou marcou.
function copyFieldValues(from, to) {
  const targets = to.querySelectorAll('input, textarea, select')
  from.querySelectorAll('input, textarea, select').forEach((field, index) => {
    const copy = targets[index]
    if (!copy) return
    if (field.type === 'checkbox' || field.type === 'radio') copy.checked = field.checked
    else if (field.type !== 'file') copy.value = field.value
  })
}

// Saída "fantasma": a Transition do Vue não anima um elemento que sai junto com o componente
// (v-if no consumidor). Um clone só visual faz a saída no lugar do diálogo. Ele é um popover
// (camada do topo, com fundo), não um modal: não torna a página inerte nem prende o foco, então o
// foco volta na hora e um diálogo reaberto logo em seguida grava o foco certo.
function playExit(dialog) {
  if (typeof HTMLElement.prototype.showPopover !== 'function') return
  const ghost = document.createElement('div')
  for (const { name, value } of dialog.attributes) {
    if (name !== 'id') ghost.setAttribute(name, value)
  }
  // Mantém os seletores do componente que dependem de [open] (ex.: .modal:not([open])).
  ghost.setAttribute('open', '')
  ghost.append(...dialog.cloneNode(true).childNodes)
  copyFieldValues(dialog, ghost)
  ghost.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'))
  ghost.setAttribute('aria-hidden', 'true')
  ghost.inert = true
  ghost.popover = 'manual'
  ghost.classList.add('dialog-motion--leaving')

  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    ghost.remove()
  }
  ghost.addEventListener('animationend', (event) => {
    if (event.target === ghost) finish()
  })
  setTimeout(finish, EXIT_FALLBACK)

  document.body.append(ghost)
  ghost.showPopover()
}

// <dialog> modal montado com v-if: abre ao montar, sai animado ao desmontar e devolve o foco para
// quem abriu. Use com a classe global `dialog-motion` no <dialog> (entrada e saída no main.css).
export function useModalDialog(dialog, { fallbackFocus } = {}) {
  let previousFocus = null

  function restoreFocus() {
    if (previousFocus?.isConnected) previousFocus.focus()
    else fallbackFocus?.()
  }

  onMounted(() => {
    previousFocus = document.activeElement
    dialog.value?.showModal()
  })

  onBeforeUnmount(() => {
    const element = dialog.value
    const animate = element?.open && !prefersReducedMotion()
    element?.close()
    if (animate) playExit(element)
    restoreFocus()
  })
}
