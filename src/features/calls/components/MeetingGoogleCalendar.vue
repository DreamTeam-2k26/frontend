<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarPlus, ExternalLink } from 'lucide-vue-next'
import { meetingCalendarUrl } from '@/utils/googleCalendar'
const props = defineProps({
  call: { type: Object, required: true },
  project: { type: Object, required: true },
})
const router = useRouter()
const href = computed(() => {
  const path = router.resolve({
    name: 'call',
    params: { id: props.project.id, callId: props.call.id },
  }).href
  const link = globalThis.location?.origin ? new URL(path, globalThis.location.origin).href : path
  return meetingCalendarUrl(props.call, link, props.project.name)
})
</script>
<template>
  <div v-if="href" class="meeting-google-block">
    <a
      class="meeting-google"
      :href="href"
      target="_blank"
      rel="noopener noreferrer"
      referrerpolicy="no-referrer"
      :aria-label="`Adicionar ${call.title || 'reunião'} ao Google Calendar (abre em nova aba)`"
      title="Adição manual. Duração sugerida: 1 hora; revise no Google. Mudanças no Fluxo não sincronizam automaticamente."
      ><CalendarPlus :size="15" aria-hidden="true" /><span>Adicionar ao Google Calendar</span
      ><ExternalLink :size="12" aria-hidden="true"
    /></a>
    <small>Adição manual · duração sugerida de 1h, ajustável no Google.</small>
  </div>
</template>
<style scoped>
.meeting-google-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 100%;
}
.meeting-google-block small {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.meeting-google {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  max-width: 100%;
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  text-decoration: none;
  padding-block: var(--space-2);
}
.meeting-google:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.meeting-google svg {
  flex-shrink: 0;
}
</style>
