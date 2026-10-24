<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ChevronLeft, ChevronRight, CalendarDays, SquareKanban } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import CalendarMonth from '@/components/calendar/CalendarMonth.vue'
import { useProjectCalendar } from '@/composables/useProjectCalendar'
import { todayISO } from '@/utils/kanban'
import { calendarTasks, monthLabel, shiftMonth, validDate, validMonth } from '@/utils/calendar'

const route = useRoute()
const router = useRouter()
const calendar = useProjectCalendar()
const { state } = calendar
const today = ref(todayISO())
const month = computed(() =>
  validMonth(route.query.month) ? route.query.month : today.value.slice(0, 7),
)
const selected = computed(() =>
  validDate(route.query.day) && route.query.day.startsWith(`${month.value}-`)
    ? route.query.day
    : today.value.startsWith(`${month.value}-`)
      ? today.value
      : `${month.value}-01`,
)
const assignee = computed(() =>
  typeof route.query.assignee === 'string' ? route.query.assignee : '',
)
const column = computed(() => (typeof route.query.column === 'string' ? route.query.column : ''))
const filteredTasks = computed(() =>
  calendarTasks(state.tasks, month.value, { assignee: assignee.value, column: column.value }),
)
const assigneeOptions = computed(() => [
  { value: '', label: 'Todos os responsáveis' },
  { value: 'none', label: 'Sem responsável' },
  ...state.members.map((member) => ({
    value: String(member.user),
    label: member.user_name || member.user_email,
  })),
])
const columnOptions = computed(() => [
  { value: '', label: 'Todos os status' },
  ...state.columns.map((item) => ({
    value: String(item.id),
    label: item.name,
    dot: item.category,
  })),
])
function query(patch) {
  const next = { ...route.query, ...patch }
  for (const key of Object.keys(next)) if (next[key] === '' || next[key] == null) delete next[key]
  router.replace({ query: next })
}
function changeMonth(offset) {
  query({ month: shiftMonth(month.value, offset), day: null })
}
function currentMonth() {
  today.value = todayISO()
  query({ month: null, day: today.value })
}
function selectDay(day) {
  query({ month: day.slice(0, 7), day })
}
function load() {
  today.value = todayISO()
  calendar.load(route.params.id)
}
let dayTimer
onMounted(() => {
  dayTimer = setInterval(() => {
    today.value = todayISO()
  }, 60000)
})
watch(() => route.params.id, load, { immediate: true })
onBeforeUnmount(() => {
  clearInterval(dayTimer)
  calendar.reset()
})
</script>
<template>
  <section
    class="calendar-page"
    :aria-busy="state.status === 'loading'"
    aria-labelledby="calendar-title"
  >
    <RouterLink
      class="calendar-page__back"
      :to="{ name: 'project-detail', params: { id: route.params.id } }"
      ><ArrowLeft :size="16" aria-hidden="true" />
      {{ state.project?.name || 'Visão geral' }}</RouterLink
    >
    <header class="calendar-page__header">
      <div>
        <h1 id="calendar-title">
          <CalendarDays :size="24" aria-hidden="true" /> Calendário de tarefas
        </h1>
        <p>Prazos do projeto, dia a dia. Abra uma tarefa para editar no Kanban.</p>
      </div>
      <BaseButton
        v-if="state.status === 'ready'"
        variant="secondary"
        :to="{
          name: 'project-kanban',
          params: { id: route.params.id },
          query: { assignee: assignee || undefined, column: column || undefined },
        }"
        ><SquareKanban :size="16" aria-hidden="true" /> Abrir Kanban</BaseButton
      >
    </header>
    <div
      v-if="state.status === 'loading' || state.status === 'idle'"
      class="calendar-page__state"
      role="status"
    >
      Carregando tarefas e prazos…
    </div>
    <div v-else-if="state.status === 'error'" class="calendar-page__state" role="alert">
      <h2>Não foi possível carregar o calendário</h2>
      <p>{{ state.error }}</p>
      <BaseButton
        v-if="![401, 403, 404].includes(state.errorStatus)"
        variant="secondary"
        @click="load"
        >Tentar novamente</BaseButton
      >
      <BaseButton
        v-if="state.errorStatus === 401"
        :to="{ name: 'login', query: { redirect: route.fullPath } }"
        >Entrar novamente</BaseButton
      >
      <BaseButton v-if="[403, 404].includes(state.errorStatus)" :to="{ name: 'projects' }"
        >Meus Projetos</BaseButton
      >
    </div>
    <template v-else-if="state.status === 'ready'">
      <div class="calendar-page__toolbar">
        <div class="calendar-page__months" role="group" aria-label="Navegar entre meses">
          <BaseButton
            variant="secondary"
            aria-label="Mês anterior"
            :disabled="month === '0001-01'"
            @click="changeMonth(-1)"
            ><ChevronLeft :size="18" aria-hidden="true"
          /></BaseButton>
          <h2 aria-live="polite">{{ monthLabel(month) }}</h2>
          <BaseButton
            variant="secondary"
            aria-label="Próximo mês"
            :disabled="month === '9999-12'"
            @click="changeMonth(1)"
            ><ChevronRight :size="18" aria-hidden="true"
          /></BaseButton>
          <BaseButton variant="secondary" @click="currentMonth">Hoje</BaseButton>
        </div>
        <div class="calendar-page__filters">
          <BaseSelect
            :model-value="assignee"
            label="Responsável"
            :options="assigneeOptions"
            @change="query({ assignee: $event })"
          />
          <BaseSelect
            :model-value="column"
            label="Status"
            :options="columnOptions"
            @change="query({ column: $event })"
          />
          <BaseButton
            v-if="assignee || column"
            variant="ghost"
            @click="query({ assignee: null, column: null })"
            >Limpar filtros</BaseButton
          >
        </div>
      </div>
      <p class="calendar-page__summary" role="status">
        {{ filteredTasks.length }}
        {{ filteredTasks.length === 1 ? 'tarefa com prazo' : 'tarefas com prazo' }} neste mês{{
          assignee || column ? ' para os filtros atuais' : ''
        }}.
      </p>
      <p v-if="!filteredTasks.length" class="calendar-page__empty">
        {{
          assignee || column
            ? 'Nenhuma tarefa encontrada neste mês para os filtros selecionados.'
            : 'Nenhuma tarefa com prazo neste mês. Tarefas sem prazo continuam disponíveis no Kanban.'
        }}
      </p>
      <CalendarMonth
        :month="month"
        :selected="selected"
        :tasks="filteredTasks"
        :columns="state.columns"
        :today="today"
        :project-id="route.params.id"
        @select="selectDay"
      />
    </template>
  </section>
</template>
<style scoped>
.calendar-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  width: 100%;
  padding: var(--space-8) var(--space-6);
  min-width: 0;
}
.calendar-page__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  align-self: flex-start;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.calendar-page__header,
.calendar-page__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4);
}
.calendar-page__header h1 {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}
.calendar-page__header p {
  margin-top: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.calendar-page__months {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.calendar-page__months h2 {
  min-width: 11rem;
  text-align: center;
  text-transform: capitalize;
  font-size: var(--font-size-lg);
}
.calendar-page__filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: flex-end;
}
.calendar-page__filters > :deep(.select) {
  min-width: 10rem;
}
.calendar-page__summary {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.calendar-page__state,
.calendar-page__empty {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
.calendar-page__empty {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
@media (max-width: 767px) {
  .calendar-page {
    padding: var(--space-5) var(--space-3);
    gap: var(--space-4);
  }
  .calendar-page__header h1 {
    font-size: var(--font-size-xl);
  }
  .calendar-page__months {
    gap: var(--space-1);
  }
  .calendar-page__months h2 {
    min-width: 8rem;
    font-size: var(--font-size-md);
  }
  .calendar-page__filters {
    width: 100%;
  }
  .calendar-page__filters > * {
    flex: 1 1 9rem;
    min-width: 0;
  }
}
</style>
