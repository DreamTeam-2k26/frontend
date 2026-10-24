<script setup>
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import { useScrollLock } from '@/composables/useScrollLock'

// Painel lateral à direita (como o detalhe de item do GitHub Projects), sobre <dialog> nativo:
// foco preso, Esc fecha, foco volta para quem abriu. No celular ocupa a tela toda.
const { labelledby } = defineProps({
  labelledby: { type: String, default: undefined },
})

const emit = defineEmits(['close'])
useScrollLock()

const dialog = useTemplateRef('dialog')
const closing = shallowRef(false)
let previousFocus = null

// Sai com animação e só então avisa o pai (que desmonta o painel).
function requestClose() {
  if (closing.value) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    emit('close')
    return
  }
  closing.value = true
  setTimeout(() => emit('close'), 180)
}

function onBackdropClick(event) {
  if (event.target === dialog.value) requestClose()
}

onMounted(() => {
  previousFocus = document.activeElement
  dialog.value?.showModal()
})

onBeforeUnmount(() => {
  if (previousFocus?.isConnected) previousFocus.focus()
})

defineExpose({ close: requestClose })
</script>

<template>
  <dialog
    ref="dialog"
    class="drawer"
    :class="{ 'drawer--closing': closing }"
    :aria-labelledby="labelledby"
    @cancel.prevent="requestClose"
    @click="onBackdropClick"
  >
    <!-- Foco inicial no painel (como no GitHub), sem anel em um botão qualquer. -->
    <div class="drawer__panel" tabindex="-1" autofocus>
      <slot :close="requestClose" />
    </div>
  </dialog>
</template>

<style scoped>
.drawer {
  inset: 0 0 0 auto;
  width: min(30rem, 100%);
  max-width: none;
  height: 100dvh;
  max-height: none;
  margin: 0;
  padding: 0;
  color: var(--color-text);
  background: var(--color-bg-card);
  border: 0;
  border-left: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  animation: drawer-in 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}
.drawer:not([open]) {
  display: none;
}
.drawer::backdrop {
  background: var(--color-overlay);
  animation: backdrop-in 0.24s ease;
}
.drawer--closing {
  animation: drawer-out 0.18s ease-in forwards;
}
.drawer--closing::backdrop {
  animation: backdrop-out 0.18s ease-in forwards;
}
.drawer__panel {
  outline: none;
  display: flex;
  flex-direction: column;
  height: 100%;
}

@keyframes drawer-in {
  from {
    transform: translateX(100%);
  }
}
@keyframes drawer-out {
  to {
    transform: translateX(100%);
  }
}
@keyframes backdrop-in {
  from {
    opacity: 0;
  }
}
@keyframes backdrop-out {
  to {
    opacity: 0;
  }
}

@media (max-width: 599px) {
  .drawer {
    width: 100%;
    border-left: 0;
  }
}
</style>
