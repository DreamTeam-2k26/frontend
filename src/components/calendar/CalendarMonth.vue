<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import CalendarTask from './CalendarTask.vue'
import { dayLabel, localDate, monthDays, monthLabel, shiftDay } from '@/utils/calendar'
const props = defineProps({
  month: { type: String, required: true },
  selected: { type: String, required: true },
  tasks: { type: Array, required: true },
  columns: { type: Array, required: true },
  today: { type: String, required: true },
  projectId: { type: [String, Number], required: true },
})
const emit = defineEmits(['select'])
const table = ref(null)
const agendaTitle = ref(null)
let focusAgenda = false
let focusDay = null
watch(
  () => props.selected,
  async (day) => {
    if (focusAgenda) {
      await nextTick()
      agendaTitle.value?.focus()
      focusAgenda = false
    }
    if (focusDay !== day) return
    await nextTick()
    table.value?.querySelector(`[data-date="${day}"]`)?.focus()
    focusDay = null
  },
)
const columnsById = computed(() => new Map(props.columns.map((item) => [String(item.id), item])))
const weeks = computed(() => {
  const days = monthDays(props.month)
  return Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7))
})
const byDay = computed(() => {
  const result = new Map()
  for (const task of props.tasks) {
    if (!result.has(task.due_date)) result.set(task.due_date, [])
    result.get(task.due_date).push(task)
  }
  return result
})
const selectedTasks = computed(() => byDay.value.get(props.selected) || [])
function showAll(day) {
  if (day === props.selected) agendaTitle.value?.focus()
  else focusAgenda = true
  emit('select', day)
}
function onKeydown(event, day) {
  const weekday = localDate(day).getDay()
  const offsets = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7,
    Home: -weekday,
    End: 6 - weekday,
  }
  if (!(event.key in offsets)) return
  event.preventDefault()
  const next = shiftDay(day, offsets[event.key])
  focusDay = next
  emit('select', next)
}
</script>
<template>
  <div class="calendar-month">
    <table ref="table" class="month-table">
      <caption class="sr-only">
        Prazos de
        {{
          monthLabel(month)
        }}. Use as setas para escolher um dia e Tab para acessar as tarefas.
      </caption>
      <thead>
        <tr>
          <th
            v-for="day in ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']"
            :key="day"
            scope="col"
          >
            {{ day }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(week, index) in weeks" :key="index">
          <td
            v-for="(day, cell) in week"
            :key="day || cell"
            :class="{ 'month-table__selected': day === selected, 'month-table__blank': !day }"
          >
            <template v-if="day">
              <button
                type="button"
                class="month-table__day"
                :data-date="day"
                :tabindex="day === selected ? 0 : -1"
                :aria-current="day === today ? 'date' : undefined"
                :aria-pressed="day === selected"
                :aria-label="`${dayLabel(day)}: ${byDay.get(day)?.length || 0} tarefas`"
                @click="emit('select', day)"
                @keydown="onKeydown($event, day)"
              >
                <span>{{ Number(day.slice(-2)) }}</span>
                <span v-if="byDay.get(day)?.length" class="month-table__count"
                  >{{ byDay.get(day).length }}<span class="sr-only"> tarefas</span></span
                >
              </button>
              <ul class="month-table__tasks">
                <li v-for="task in (byDay.get(day) || []).slice(0, 3)" :key="task.id">
                  <CalendarTask
                    :task="task"
                    :project-id="projectId"
                    :columns="columnsById"
                    :today="today"
                  />
                </li>
              </ul>
              <button
                v-if="byDay.get(day)?.length > 3"
                type="button"
                class="month-table__more"
                :aria-label="`Ver todas as ${byDay.get(day).length} tarefas de ${dayLabel(day)}`"
                @click="showAll(day)"
              >
                +{{ byDay.get(day).length - 3 }} tarefas
              </button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
    <section class="day-agenda" aria-labelledby="day-agenda-title" aria-live="polite">
      <header>
        <h2 id="day-agenda-title" ref="agendaTitle" tabindex="-1">{{ dayLabel(selected) }}</h2>
        <span
          >{{ selectedTasks.length }} {{ selectedTasks.length === 1 ? 'tarefa' : 'tarefas' }}</span
        >
      </header>
      <ul v-if="selectedTasks.length">
        <li v-for="task in selectedTasks" :key="task.id">
          <CalendarTask
            :task="task"
            :project-id="projectId"
            :columns="columnsById"
            :today="today"
          />
        </li>
      </ul>
      <p v-else>
        Nenhuma tarefa com prazo neste dia{{ tasks.length ? ' para os filtros atuais' : '' }}.
      </p>
    </section>
  </div>
</template>
<style scoped>
.month-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.month-table th {
  padding: var(--space-3) var(--space-1);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.month-table td {
  height: 10rem;
  vertical-align: top;
  padding: var(--space-2);
  border-top: 1px solid var(--color-border);
  border-right: 1px solid var(--color-border);
}
.month-table td:last-child {
  border-right: 0;
}
.month-table__selected {
  background: color-mix(in srgb, var(--color-primary) 8%, var(--color-bg-card));
}
.month-table__blank {
  background: var(--color-bg-subtle);
}
.month-table__day {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  min-height: 2.75rem;
  padding: var(--space-1);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  font-weight: var(--font-weight-semibold);
}
.month-table__day[aria-pressed='true'] {
  border-color: var(--color-primary);
}
.month-table__day[aria-current='date'] > span:first-child {
  color: var(--color-primary);
  text-decoration: underline;
  text-underline-offset: 4px;
}
.month-table__count {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.month-table__tasks,
.day-agenda ul {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  list-style: none;
  padding: 0;
}
.month-table__more {
  background: transparent;
  border: 0;
  color: var(--color-primary);
  cursor: pointer;
  min-height: 2.75rem;
  font-size: var(--font-size-xs);
}
.day-agenda {
  margin-top: var(--space-5);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
}
.day-agenda header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.day-agenda h2 {
  font-size: var(--font-size-md);
  text-transform: capitalize;
}
.day-agenda header span,
.day-agenda p {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
@media (max-width: 767px) {
  .month-table td {
    height: auto;
    padding: 1px;
  }
  .month-table__day {
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    padding: 3px 0;
    min-height: 3.25rem;
  }
  .month-table__tasks,
  .month-table__more {
    display: none;
  }
  .month-table th {
    padding: var(--space-2) 0;
  }
  .day-agenda {
    padding: var(--space-3);
  }
}
</style>
