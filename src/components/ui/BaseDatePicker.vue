<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-vue-next'
import { useFloating } from '@/composables/useFloating'
import { dateKey, parseDay, monthDays, withinDays } from '@/utils/calendar'
import GoogleCalendarLink from './GoogleCalendarLink.vue'

const model = defineModel({ type: String, default: '' })
const props = defineProps({
  label: { type: String, required: true },
  id: { type: String, default: '' },
  name: { type: String, default: '' },
  datetime: Boolean,
  disabled: Boolean,
  required: Boolean,
  hideLabel: Boolean,
  error: { type: String, default: '' },
  min: { type: String, default: '' },
  max: { type: String, default: '' },
  calendarTitle: { type: String, default: 'Compromisso no Fluxo' },
  calendarDescription: { type: String, default: '' },
})
const emit = defineEmits(['change', 'blur'])
const uid = useId()
const inputId = computed(() => props.id || uid)
const trigger = ref(null)
const popup = ref(null)
const floating = useFloating(trigger, popup)
const activeDay = ref('')
const draftDay = ref('')
const hour = ref('09')
const minute = ref('00')
const visibleMonth = ref(new Date())
const monthLabel = computed(() =>
  new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(visibleMonth.value),
)
const days = computed(() =>
  monthDays(visibleMonth.value.getFullYear(), visibleMonth.value.getMonth()),
)
const today = dateKey(new Date())
const display = computed(() => {
  const day = parseDay(model.value.slice(0, 10))
  if (!day) return props.datetime ? 'Selecionar data e hora' : 'Selecionar data'
  const text = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(day)
  return props.datetime ? `${text} às ${model.value.slice(11, 16)}` : text
})
const candidate = computed(() =>
  draftDay.value ? `${draftDay.value}T${hour.value}:${minute.value}` : '',
)
const validCandidate = computed(
  () =>
    withinDays(draftDay.value, props.min, props.max) &&
    (!props.min || candidate.value >= props.min) &&
    (!props.max || candidate.value <= (props.max.length === 10 ? `${props.max}T23:59` : props.max)),
)
const dayLabel = (value) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(parseDay(value))
const allowed = (key) => withinDays(key, props.min, props.max)

async function focusDay() {
  await nextTick()
  popup.value?.querySelector(`[data-day="${activeDay.value}"]`)?.focus()
}
async function open() {
  if (props.disabled) return
  let initial = model.value.slice(0, 10) || today
  if (!allowed(initial)) initial = props.min.slice(0, 10) || props.max.slice(0, 10) || today
  draftDay.value = model.value.slice(0, 10)
  hour.value = model.value.slice(11, 13) || '09'
  minute.value = model.value.slice(14, 16) || '00'
  activeDay.value = initial
  visibleMonth.value = parseDay(initial) || new Date()
  await floating.show()
  document.addEventListener('pointerdown', outside, true)
  document.addEventListener('focusin', outside)
  await focusDay()
}
function close(returnFocus = true) {
  floating.hide()
  document.removeEventListener('pointerdown', outside, true)
  document.removeEventListener('focusin', outside)
  if (returnFocus) trigger.value?.focus()
  emit('blur')
}
function outside(event) {
  if (!trigger.value?.contains(event.target) && !popup.value?.contains(event.target)) close(false)
}
function commit(value) {
  if (props.disabled) return
  const changed = value !== model.value
  model.value = value
  if (changed) emit('change', value)
  close()
}
function pick(key) {
  if (!allowed(key)) return
  activeDay.value = key
  if (props.datetime) {
    draftDay.value = key
    visibleMonth.value = parseDay(key)
  } else commit(key)
}
function changeMonth(delta) {
  const date = new Date(
    visibleMonth.value.getFullYear(),
    visibleMonth.value.getMonth() + delta,
    1,
    12,
  )
  if (date.getFullYear() < 1000 || date.getFullYear() > 9999) return
  visibleMonth.value = date
  const first = days.value.find((day) => !day.outside && allowed(day.key))
  if (first) activeDay.value = first.key
}
function onDayKey(event, key) {
  let offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key]
  if (event.key === 'Home') offset = -((parseDay(key).getDay() + 6) % 7)
  if (event.key === 'End') offset = 6 - ((parseDay(key).getDay() + 6) % 7)
  if (event.key === 'PageUp' || event.key === 'PageDown') {
    event.preventDefault()
    changeMonth(event.key === 'PageUp' ? -1 : 1)
    focusDay()
    return
  }
  if (offset === undefined) return
  event.preventDefault()
  const date = parseDay(key)
  date.setDate(date.getDate() + offset)
  const next = dateKey(date)
  if (!allowed(next)) return
  activeDay.value = next
  visibleMonth.value = date
  focusDay()
}
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled && floating.open.value) close(false)
  },
)
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outside, true)
  document.removeEventListener('focusin', outside)
})
</script>

<template>
  <div class="date-field">
    <label :for="inputId" :class="{ 'sr-only': hideLabel }"
      >{{ label }}<span v-if="required" aria-hidden="true"> *</span></label
    >
    <button
      :id="inputId"
      ref="trigger"
      type="button"
      class="date-field__trigger"
      :disabled="disabled"
      :aria-invalid="Boolean(error)"
      :aria-required="required || undefined"
      :aria-describedby="error ? `${uid}-error` : undefined"
      aria-haspopup="dialog"
      :aria-expanded="floating.open.value"
      :aria-controls="floating.open.value ? `${uid}-calendar` : undefined"
      @click="floating.open.value ? close() : open()"
      @keydown.esc.stop.prevent="close()"
    >
      <CalendarDays :size="18" aria-hidden="true" /><span
        :class="{ 'date-field__placeholder': !model }"
        >{{ display }}</span
      >
    </button>
    <input v-if="name" type="hidden" :name="name" :value="model" :disabled="disabled" />
    <small v-if="error" :id="`${uid}-error`" class="date-field__error" role="alert">{{
      error
    }}</small>
    <GoogleCalendarLink
      :start="model"
      :title="calendarTitle"
      :description="calendarDescription"
      :disabled="disabled || Boolean(error)"
    />
    <Teleport v-if="floating.open.value" :to="floating.teleportTo.value">
      <div
        :id="`${uid}-calendar`"
        ref="popup"
        class="calendar"
        :style="floating.style"
        role="dialog"
        :aria-label="label"
        @keydown.esc.stop.prevent="close()"
      >
        <header class="calendar__heading">
          <button type="button" aria-label="Mês anterior" @click="changeMonth(-1)">
            <ChevronLeft :size="18" aria-hidden="true" />
          </button>
          <strong aria-live="polite">{{ monthLabel }}</strong>
          <button type="button" aria-label="Próximo mês" @click="changeMonth(1)">
            <ChevronRight :size="18" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Fechar calendário" @click="close()">
            <X :size="16" aria-hidden="true" />
          </button>
        </header>
        <div class="calendar__week" aria-hidden="true">
          <span v-for="day in ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']" :key="day">{{
            day
          }}</span>
        </div>
        <div class="calendar__days" role="group" :aria-label="monthLabel">
          <button
            v-for="day in days"
            :key="day.key"
            type="button"
            :data-day="day.key"
            :aria-label="dayLabel(day.key)"
            :aria-pressed="day.key === (datetime ? draftDay : model)"
            :aria-current="day.key === today ? 'date' : undefined"
            :disabled="!allowed(day.key)"
            :tabindex="day.key === activeDay ? 0 : -1"
            :class="{
              'is-outside': day.outside,
              'is-selected': day.key === (datetime ? draftDay : model),
              'is-today': day.key === today,
            }"
            @click="pick(day.key)"
            @keydown="onDayKey($event, day.key)"
          >
            {{ day.day }}
          </button>
        </div>
        <div v-if="datetime" class="calendar__time">
          <label :for="`${uid}-hour`">Horário</label>
          <select :id="`${uid}-hour`" v-model="hour" aria-label="Hora">
            <option v-for="n in 24" :key="n" :value="String(n - 1).padStart(2, '0')">
              {{ String(n - 1).padStart(2, '0') }}
            </option>
          </select>
          <span aria-hidden="true">:</span>
          <select v-model="minute" aria-label="Minutos">
            <option v-for="n in 60" :key="n" :value="String(n - 1).padStart(2, '0')">
              {{ String(n - 1).padStart(2, '0') }}
            </option>
          </select>
        </div>
        <footer class="calendar__footer">
          <button v-if="!required" type="button" @click="commit('')">Limpar</button>
          <button type="button" :disabled="!allowed(today)" @click="pick(today)">Hoje</button>
          <button
            v-if="datetime"
            type="button"
            class="calendar__apply"
            :disabled="!validCandidate"
            @click="commit(candidate)"
          >
            Aplicar
          </button>
        </footer>
      </div>
    </Teleport>
  </div>
</template>
<style scoped>
.date-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}
.date-field > label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
.date-field__trigger {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-height: 2.75rem;
  padding: var(--space-2) var(--space-3);
  text-align: left;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-input-bg);
  font-size: var(--font-size-sm);
}
.date-field__trigger:hover:not(:disabled) {
  border-color: var(--color-primary);
}
.date-field__trigger[aria-invalid='true'] {
  border-color: var(--color-danger);
}
.date-field__trigger:disabled {
  background: var(--color-bg-subtle);
}
.date-field__placeholder {
  color: var(--color-text-secondary);
}
.date-field__error {
  color: var(--color-danger);
  font-size: var(--font-size-xs);
}
.calendar {
  position: fixed;
  z-index: 40;
  width: min(20rem, calc(100vw - 1rem));
  max-height: calc(100dvh - 1rem);
  overflow-y: auto;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  color: var(--color-text);
  box-shadow: var(--shadow-md);
  font-size: var(--font-size-sm);
}
.calendar__heading {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-bottom: var(--space-3);
}
.calendar__heading strong {
  flex: 1;
  text-align: center;
  text-transform: capitalize;
  font-weight: var(--font-weight-semibold);
}
.calendar__heading button {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  min-height: 2rem;
  border-radius: var(--radius-sm);
}
.calendar__week,
.calendar__days {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--space-1);
}
.calendar__week {
  color: var(--color-text-secondary);
  text-align: center;
  font-size: var(--font-size-xs);
  padding-bottom: var(--space-2);
}
.calendar__days button {
  min-height: 2.25rem;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
}
.calendar button:hover:not(:disabled) {
  background: var(--color-bg-hover);
}
.calendar__days .is-outside {
  color: var(--color-text-secondary);
}
.calendar__days .is-today {
  box-shadow: inset 0 0 0 1px var(--color-primary);
}
.calendar__days .is-selected,
.calendar__days .is-selected:hover {
  background: var(--color-button-primary-bg);
  color: var(--color-on-primary);
}
.calendar__time {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}
.calendar__time label {
  flex: 1;
}
.calendar__time select {
  width: auto;
  min-height: 2.25rem;
  padding: var(--space-1) var(--space-2);
}
.calendar__footer {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
  padding-top: var(--space-3);
  margin-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}
.calendar__footer button {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  font-weight: var(--font-weight-medium);
}
.calendar__footer .calendar__apply {
  background: var(--color-button-primary-bg);
  color: var(--color-on-primary);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
