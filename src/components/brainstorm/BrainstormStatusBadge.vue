<script setup>
import { computed } from 'vue'
import { Archive, CircleCheck, Hourglass, MessagesSquare, RefreshCw } from 'lucide-vue-next'
import { statusLabel } from '@/utils/brainstorm'

// Status da discussão com ícone + texto (nunca só cor). "Em revisão" aparece junto quando reaberta.
const { status, inReview = false } = defineProps({
  status: { type: String, required: true },
  inReview: { type: Boolean, default: false },
})

const ICONS = { open: MessagesSquare, closed: Hourglass, decided: CircleCheck, archived: Archive }
const icon = computed(() => ICONS[status] ?? MessagesSquare)
const label = computed(() =>
  status === 'closed' ? 'Encerrada · aguardando decisão' : statusLabel(status),
)
</script>

<template>
  <span class="status-badges">
    <span class="status-badge" :class="`status-badge--${status}`">
      <component :is="icon" :size="13" aria-hidden="true" />
      {{ label }}
    </span>
    <span v-if="inReview" class="status-badge status-badge--review">
      <RefreshCw :size="13" aria-hidden="true" />
      Em revisão
    </span>
  </span>
</template>

<style scoped>
.status-badges {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0.125rem var(--space-2);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  border: 1px solid currentColor;
  border-radius: 999px;
}
.status-badge--open {
  color: var(--color-status-doing);
}
.status-badge--closed {
  color: var(--color-warning);
}
.status-badge--decided {
  color: var(--color-status-done);
}
.status-badge--archived {
  color: var(--color-text-secondary);
}
.status-badge--review {
  color: var(--color-info);
}
</style>
