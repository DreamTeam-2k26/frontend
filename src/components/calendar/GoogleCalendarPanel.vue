<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarDays, Download, ExternalLink } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import { calendarTaskRoute, monthLabel } from '@/utils/calendar'
import { deadlineDates, deadlinesIcs } from '@/utils/googleCalendar'
const props = defineProps({
  tasks: { type: Array, required: true },
  project: { type: Object, required: true },
  month: { type: String, required: true },
})
const router = useRouter()
const status = ref('')
const exportable = computed(() => props.tasks.filter((task) => deadlineDates(task.due_date)))
function download() {
  const text = deadlinesIcs(exportable.value, {
    projectId: props.project.id,
    projectName: props.project.name,
    taskUrl(id) {
      return new URL(
        router.resolve(calendarTaskRoute(props.project.id, id)).href,
        window.location.origin,
      ).href
    },
  })
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `fluxo-prazos-${props.project.id}-${props.month}.ics`
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  status.value =
    'Arquivo preparado. No Google Calendar, abra Configurações → Importar e exportar e selecione o arquivo.'
}
</script>
<template>
  <section class="google-calendar-panel" aria-labelledby="google-calendar-title">
    <div class="google-calendar-panel__heading">
      <CalendarDays :size="22" aria-hidden="true" />
      <div>
        <h2 id="google-calendar-title">Seus prazos no Google Calendar</h2>
        <span class="google-calendar-panel__badge">Adição manual</span>
      </div>
    </div>
    <p>
      Leve os prazos finais como eventos de dia inteiro. Use “Adicionar ao Google Calendar” na
      tarefa ou exporte os {{ exportable.length }} prazos de {{ monthLabel(month) }} com os filtros
      atuais.
    </p>
    <div class="google-calendar-panel__actions">
      <BaseButton variant="secondary" :disabled="!exportable.length" @click="download"
        ><Download :size="16" aria-hidden="true" /> Exportar prazos do mês (.ics)</BaseButton
      ><a
        href="https://calendar.google.com/calendar/r/settings/export"
        target="_blank"
        rel="noopener noreferrer"
        >Importar no Google Calendar <ExternalLink :size="14" aria-hidden="true"
      /></a>
    </div>
    <small
      >Você escolhe a agenda e confirma no Google. Os eventos exportados não são atualizados
      automaticamente quando o prazo muda no Fluxo; novas importações podem duplicar eventos.</small
    >
    <p v-if="status" role="status">{{ status }}</p>
  </section>
</template>
<style scoped>
.google-calendar-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
}
.google-calendar-panel__heading {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-primary);
}
.google-calendar-panel__heading > div {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  flex-wrap: wrap;
}
.google-calendar-panel h2 {
  color: var(--color-text);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
}
.google-calendar-panel__badge {
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  background: var(--color-bg-subtle);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
}
.google-calendar-panel p {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.google-calendar-panel small {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.google-calendar-panel__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4);
}
.google-calendar-panel a {
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
}
</style>
