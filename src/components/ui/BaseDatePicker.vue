<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useFloating } from '@/composables/useFloating'
import {
  dayLabel,
  localDate,
  monthDays,
  monthLabel,
  shiftDay,
  shiftMonth,
  validDate,
} from '@/utils/calendar'
import { todayISO } from '@/utils/kanban'
const model = defineModel({ type: String, default: '' })
const props = defineProps({
  label: { type: String, default: 'Prazo' },
  min: { type: String, default: '' },
  disabled: Boolean,
  error: { type: String, default: '' },
  name: { type: String, default: '' },
  hideLabel: Boolean,
})
const emit = defineEmits(['blur', 'change'])
const id = useId()
const trigger = ref(null)
const panel = ref(null)
const floating = useFloating(trigger, panel)
let blurTimer
const today = ref(todayISO())
const cursor = ref(today.value)
const month = ref(today.value.slice(0, 7))
const days = computed(() => monthDays(month.value))
const display = computed(() =>
  validDate(model.value) ? model.value.split('-').reverse().join(' / ') : 'Selecionar data',
)
const allowed = (day) => validDate(day) && (!props.min || day >= props.min)
function close(returnFocus = true) {
  floating.hide()
  document.removeEventListener('pointerdown', outside, true)
  emit('blur')
  if (returnFocus) trigger.value?.focus()
}
function outside(event) {
  if (!trigger.value?.contains(event.target) && !panel.value?.contains(event.target)) close(false)
}
async function focusDay() {
  await nextTick()
  panel.value?.querySelector(`[data-date="${cursor.value}"]`)?.focus()
}
async function open() {
  if (props.disabled) return
  if (floating.open.value) return close()
  today.value = todayISO()
  cursor.value =
    validDate(model.value) && allowed(model.value)
      ? model.value
      : props.min && props.min > today.value
        ? props.min
        : today.value
  month.value = cursor.value.slice(0, 7)
  await floating.show()
  document.addEventListener('pointerdown', outside, true)
  focusDay()
}
function pick(day) {
  if (day && !allowed(day)) return
  model.value = day
  emit('change', day)
  close()
}
function navigate(offset) {
  const next = shiftMonth(month.value, offset)
  if (props.min && next < props.min.slice(0, 7)) return
  month.value = next
  cursor.value = days.value.find((day) => day && allowed(day)) || `${month.value}-01`
  nextTick(() => floating.update(true))
}
function keydown(event, day) {
  const weekday = localDate(day).getDay()
  const offsets = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7,
    Home: -weekday,
    End: 6 - weekday,
  }
  if (event.key === 'PageUp' || event.key === 'PageDown') {
    event.preventDefault()
    navigate(event.key === 'PageUp' ? -1 : 1)
    focusDay()
  } else if (event.key in offsets) {
    event.preventDefault()
    const next = shiftDay(day, offsets[event.key])
    if (!allowed(next)) return
    cursor.value = next
    month.value = next.slice(0, 7)
    focusDay()
  }
}
function panelKeys(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    close()
  }
  if (event.key === 'Tab') {
    // Fecha depois do deslocamento nativo do foco, sem prender o usuário no popover.
    clearTimeout(blurTimer)
    blurTimer = setTimeout(() => {
      if (floating.open.value && !panel.value?.contains(document.activeElement)) close(false)
    }, 0)
  }
}
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled && floating.open.value) close(false)
  },
)
onBeforeUnmount(() => {
  clearTimeout(blurTimer)
  document.removeEventListener('pointerdown', outside, true)
})
</script>
<template>
  <div class="date-field">
    <label
      :id="`${id}-label`"
      :for="id"
      class="date-field__label"
      :class="{ 'date-field__sr': hideLabel }"
      >{{ label }}</label
    >
    <button
      :id="id"
      ref="trigger"
      type="button"
      class="date-field__trigger"
      :class="{ 'date-field__trigger--empty': !model }"
      :disabled="disabled"
      :aria-labelledby="`${id}-label ${id}-value`"
      aria-haspopup="dialog"
      :aria-expanded="floating.open.value"
      :aria-controls="floating.open.value ? `${id}-panel` : undefined"
      :aria-invalid="!!error"
      :aria-describedby="error ? `${id}-error` : undefined"
      @click="open"
      @keydown.down.prevent="!floating.open.value && open()"
    >
      <span :id="`${id}-value`">{{ display }}</span
      ><CalendarDays :size="18" aria-hidden="true" />
    </button>
    <input v-if="name" type="hidden" :name="name" :value="model" :disabled="disabled" />
    <small v-if="error" :id="`${id}-error`" class="date-field__error" aria-live="polite">{{
      error
    }}</small>
    <Teleport v-if="floating.open.value" :to="floating.teleportTo.value">
      <div
        :id="`${id}-panel`"
        ref="panel"
        class="date-picker"
        :style="floating.style"
        role="dialog"
        :aria-labelledby="`${id}-heading`"
        @keydown="panelKeys"
      >
        <header class="date-picker__header">
          <button
            type="button"
            aria-label="Mês anterior"
            :disabled="month === '0001-01' || (!!min && month <= min.slice(0, 7))"
            @click="navigate(-1)"
          >
            <ChevronLeft :size="18" aria-hidden="true" />
          </button>
          <h3 :id="`${id}-heading`" aria-live="polite">{{ monthLabel(month) }}</h3>
          <button
            type="button"
            aria-label="Próximo mês"
            :disabled="month === '9999-12'"
            @click="navigate(1)"
          >
            <ChevronRight :size="18" aria-hidden="true" />
          </button>
        </header>
        <div class="date-picker__week" aria-hidden="true">
          <span v-for="(day, index) in ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']" :key="index">{{
            day
          }}</span>
        </div>
        <div class="date-picker__grid" role="group" aria-label="Escolher dia do prazo">
          <template v-for="(day, index) in days" :key="day || index">
            <button
              v-if="day"
              type="button"
              :data-date="day"
              :disabled="!allowed(day)"
              :tabindex="day === cursor ? 0 : -1"
              :aria-label="dayLabel(day)"
              :aria-pressed="day === model"
              :aria-current="day === today ? 'date' : undefined"
              @focus="cursor = day"
              @click="pick(day)"
              @keydown="keydown($event, day)"
            >
              {{ Number(day.slice(-2)) }}</button
            ><span v-else />
          </template>
        </div>
        <footer class="date-picker__footer">
          <button type="button" :disabled="!allowed(today)" @click="pick(today)">Hoje</button
          ><button type="button" :disabled="!model" @click="pick('')">Limpar prazo</button>
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
.date-field__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}
.date-field__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  width: 100%;
  min-height: 2.75rem;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-input-bg);
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.date-field__trigger--empty {
  color: var(--color-text-secondary);
}
.date-field__trigger:hover:not(:disabled),
.date-field__trigger[aria-expanded='true'] {
  border-color: var(--color-primary);
}
.date-field__trigger[aria-invalid='true'] {
  border-color: var(--color-danger);
}
.date-field__error {
  color: var(--color-danger);
  font-size: var(--font-size-xs);
}
.date-field__trigger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.date-picker {
  position: fixed;
  z-index: 1100;
  width: min(19rem, calc(100vw - 1rem));
  max-height: calc(100dvh - 1rem);
  overflow: auto;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  color: var(--color-text);
  background: var(--color-bg-card);
  box-shadow: 0 12px 36px color-mix(in srgb, var(--color-text) 16%, transparent);
}
.date-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.date-picker__header h3 {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-transform: capitalize;
}
.date-picker button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--color-text);
  border: 0;
  border-radius: var(--radius-sm);
  min-height: 2.25rem;
  font: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.date-picker button:hover:not(:disabled) {
  background: var(--color-bg-subtle);
}
.date-picker button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.date-picker__week,
.date-picker__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 3px;
  text-align: center;
}
.date-picker__week {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  margin-bottom: var(--space-2);
}
.date-picker__grid button[aria-current='date'] {
  box-shadow: inset 0 0 0 1px var(--color-primary);
  color: var(--color-primary);
}
.date-picker__grid button[aria-pressed='true'] {
  background: var(--color-button-primary-bg);
  color: var(--color-on-primary);
  font-weight: var(--font-weight-semibold);
}
.date-picker__footer {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  border-top: 1px solid var(--color-border);
  margin-top: var(--space-3);
  padding-top: var(--space-2);
}
.date-picker__footer button {
  color: var(--color-primary);
  padding-inline: var(--space-2);
}
.date-field__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
</style>
