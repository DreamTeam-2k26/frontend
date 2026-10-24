<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarPlus, ExternalLink } from 'lucide-vue-next'
import { googleCalendarUrl } from '@/utils/googleCalendar'
import { calendarTaskRoute } from '@/utils/calendar'
const props = defineProps({
  task: { type: Object, required: true },
  projectId: { type: [String, Number], required: true },
  projectName: { type: String, default: '' },
})
const router = useRouter()
const href = computed(() => {
  const path = router.resolve(calendarTaskRoute(props.projectId, props.task.id)).href
  const link = globalThis.location?.origin ? new URL(path, globalThis.location.origin).href : path
  return googleCalendarUrl(props.task, link, props.projectName)
})
</script>
<template>
  <a
    v-if="href"
    class="google-calendar-link"
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    referrerpolicy="no-referrer"
    :aria-label="`Adicionar prazo de ${task.title} ao Google Calendar (abre em nova aba)`"
    title="Revise e salve no Google Calendar. Alterações posteriores são manuais."
    ><CalendarPlus :size="15" aria-hidden="true" /><span>Adicionar ao Google Calendar</span
    ><ExternalLink :size="12" aria-hidden="true"
  /></a>
</template>
<style scoped>
.google-calendar-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  max-width: 100%;
  padding-block: var(--space-2);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  text-decoration: none;
}
.google-calendar-link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.google-calendar-link svg {
  flex-shrink: 0;
}
</style>
