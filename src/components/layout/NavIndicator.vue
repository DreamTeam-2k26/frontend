<script setup>
import { motion } from 'motion-v'
import { EASE, MOTION } from '@/utils/motion'

// Barra do item ativo. Itens do mesmo grupo compartilham o layoutId: ao trocar de página a barra
// desliza do item anterior para o novo em vez de sumir e reaparecer.
const { group, placement = 'edge' } = defineProps({
  group: { type: String, required: true },
  // edge: borda esquerda da sidebar; top: topo do item na barra inferior do celular.
  placement: {
    type: String,
    default: 'edge',
    validator: (value) => ['edge', 'top'].includes(value),
  },
})
</script>

<template>
  <motion.span
    :layout-id="group"
    class="nav-indicator"
    :class="`nav-indicator--${placement}`"
    :transition="{ duration: MOTION.slow, ease: EASE.flow }"
    aria-hidden="true"
  />
</template>

<style scoped>
.nav-indicator {
  position: absolute;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
}

/* Recua o padding lateral da SideBar: a barra fica na borda, como no Figma. */
.nav-indicator--edge {
  top: var(--space-1);
  bottom: var(--space-1);
  left: calc(-1 * var(--space-3));
  width: 3px;
}

.nav-indicator--top {
  top: 0;
  left: calc(50% - 0.75rem);
  width: 1.5rem;
  height: 3px;
}
</style>
