<script setup>
import { computed } from 'vue'
import { CalendarPlus, ExternalLink } from 'lucide-vue-next'
import { googleCalendarUrl } from '@/utils/calendar'
const props = defineProps({
  start: { type: String, default: '' },
  title: { type: String, default: 'Compromisso no Fluxo' },
  description: { type: String, default: '' },
  disabled: Boolean,
})
const href = computed(() => (props.disabled ? '' : googleCalendarUrl(props)))
</script>
<template>
  <a
    v-if="href"
    class="google-calendar"
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Adicionar ao Google Calendar (abre em nova aba)"
    title="Abre um evento para você confirmar no Google Calendar"
  >
    <CalendarPlus :size="16" aria-hidden="true" /> Adicionar ao Google Calendar
    <ExternalLink :size="13" aria-hidden="true" />
  </a>
</template>
<style scoped>
.google-calendar {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  align-self: flex-start;
  min-height: 2rem;
  max-width: 100%;
  color: var(--color-primary-hover);
  font-size: var(--font-size-xs);
  border-radius: var(--radius-sm);
  overflow-wrap: anywhere;
}
.google-calendar:hover {
  text-decoration: underline;
}
</style>
