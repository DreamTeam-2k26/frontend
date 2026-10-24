<script setup>
import { computed, useId, useTemplateRef } from 'vue'
import { Check, ListFilter } from 'lucide-vue-next'
import UserAvatar from '@/components/user/UserAvatar.vue'
import { useFloating } from '@/composables/useFloating'
import { PRIORITIES } from '@/utils/kanban'

const { filters, members, columns } = defineProps({
  // { priority, assignee, column, due } (a busca fica fora do popover)
  filters: { type: Object, required: true },
  members: { type: Array, required: true },
  columns: { type: Array, required: true },
})

const emit = defineEmits({
  change: (patch) => patch && typeof patch === 'object',
  clear: null,
})

const panelId = useId()
const trigger = useTemplateRef('trigger')
const panel = useTemplateRef('panel')
const floating = useFloating(trigger, panel)

const KEYS = ['priority', 'assignee', 'column', 'due']
const activeCount = computed(() => KEYS.filter((key) => filters[key]).length)

const groups = computed(() => [
  {
    key: 'priority',
    title: 'Prioridade',
    options: PRIORITIES.map((priority) => ({ ...priority, dot: priority.value })),
  },
  {
    key: 'assignee',
    title: 'Responsável',
    options: [
      { value: 'none', label: 'Sem responsável' },
      ...members.map((member) => ({
        value: String(member.user),
        label: member.user_name || member.user_email,
        avatar: member.user_name || member.user_email,
        avatarSrc: member.user_profile_picture || '',
      })),
    ],
  },
  {
    key: 'column',
    title: 'Coluna',
    options: columns.map((column) => ({
      value: String(column.id),
      label: column.name,
      dot: column.category,
    })),
  },
  {
    key: 'due',
    title: 'Prazo',
    options: [
      { value: 'overdue', label: 'Atrasadas' },
      { value: 'no_date', label: 'Sem prazo' },
    ],
  },
])

// Chip funciona como rádio que pode ser desmarcado (clicar no ativo limpa o grupo).
function toggle(key, value) {
  emit('change', { [key]: filters[key] === value ? '' : value })
}

function onOutside(event) {
  if (!trigger.value?.contains(event.target) && !panel.value?.contains(event.target)) close(false)
}

async function open() {
  await floating.show()
  document.addEventListener('pointerdown', onOutside, true)
  panel.value?.querySelector('button')?.focus()
}

function close(returnFocus = true) {
  floating.hide()
  document.removeEventListener('pointerdown', onOutside, true)
  if (returnFocus) trigger.value?.focus()
}

function onKeydown(event) {
  if (event.key !== 'Escape') return
  event.stopPropagation()
  close()
}
</script>

<template>
  <div class="filter">
    <button
      ref="trigger"
      type="button"
      class="filter__button"
      :class="{ 'filter__button--active': activeCount || floating.open.value }"
      aria-haspopup="dialog"
      :aria-expanded="floating.open.value"
      :aria-controls="floating.open.value ? panelId : undefined"
      @click="floating.open.value ? close() : open()"
    >
      <ListFilter :size="16" aria-hidden="true" />
      Filtrar
      <span v-if="activeCount" class="filter__badge">
        {{ activeCount }}<span class="visually-hidden"> ativos</span>
      </span>
    </button>

    <Teleport :to="floating.teleportTo.value">
      <Transition name="filter-pop">
        <div
          v-if="floating.open.value"
          :id="panelId"
          ref="panel"
          class="filter__panel"
          role="dialog"
          aria-label="Filtros"
          :style="floating.style"
          @keydown="onKeydown"
          @pointerdown.stop
        >
          <fieldset v-for="group in groups" :key="group.key" class="filter__group">
            <legend class="filter__title">{{ group.title }}</legend>
            <div class="filter__chips">
              <button
                v-for="option in group.options"
                :key="option.value"
                type="button"
                class="filter__chip"
                :class="{ 'filter__chip--on': filters[group.key] === option.value }"
                :aria-pressed="filters[group.key] === option.value"
                @click="toggle(group.key, option.value)"
              >
                <Check v-if="filters[group.key] === option.value" :size="14" aria-hidden="true" />
                <span
                  v-else-if="option.dot"
                  class="filter__dot"
                  :class="`filter__dot--${option.dot}`"
                  aria-hidden="true"
                />
                <UserAvatar
                  v-else-if="option.avatar"
                  class="filter__avatar"
                  :name="option.avatar"
                  :src="option.avatarSrc"
                  size="sm"
                />
                {{ option.label }}
              </button>
            </div>
          </fieldset>
          <footer class="filter__footer">
            <button
              type="button"
              class="filter__clear"
              :disabled="!activeCount"
              @click="emit('clear')"
            >
              Limpar filtros
            </button>
            <button type="button" class="filter__done" @click="close()">Concluir</button>
          </footer>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.filter__button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 2.5rem;
  padding: 0 var(--space-3);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}
.filter__button:hover {
  background: var(--color-bg-hover);
}
.filter__button--active {
  border-color: color-mix(in srgb, var(--color-primary) 55%, transparent);
}
.filter__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 var(--space-1);
  color: var(--color-on-primary);
  background: var(--color-button-primary-bg);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.filter__panel {
  position: fixed;
  z-index: var(--z-popover);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: min(23rem, calc(100vw - 1rem));
  max-height: min(32rem, calc(100dvh - 1rem));
  overflow-y: auto;
  padding: var(--space-4);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  transform-origin: top left;
}
.filter__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
  padding: 0;
  border: 0;
}
.filter__title {
  margin-bottom: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.filter__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.filter__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 2rem;
  padding: 0 var(--space-3);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  background: var(--color-bg-subtle);
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    transform 0.1s ease;
}
.filter__chip:hover {
  background: var(--color-bg-hover);
}
.filter__chip:active {
  transform: scale(0.97);
}
.filter__chip--on {
  color: var(--color-primary-hover);
  background: color-mix(in srgb, var(--color-primary) 14%, var(--color-bg-card));
  border-color: color-mix(in srgb, var(--color-primary) 45%, transparent);
  font-weight: var(--font-weight-medium);
}
.filter__avatar {
  width: 1.25rem;
  height: 1.25rem;
  font-size: 0.5625rem;
}
.filter__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: var(--radius-full);
  background: var(--color-status-todo);
}
.filter__dot--in_progress,
.filter__dot--medium {
  background: var(--color-warning);
}
.filter__dot--done,
.filter__dot--low {
  background: var(--color-success);
}
.filter__dot--high {
  background: var(--color-danger);
}
.filter__footer {
  display: flex;
  justify-content: space-between;
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}
.filter__clear,
.filter__done {
  min-height: 2.25rem;
  padding: 0 var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-sm);
}
.filter__clear {
  color: var(--color-text-secondary);
}
.filter__clear:hover:not(:disabled) {
  color: var(--color-text);
  background: var(--color-bg-hover);
}
.filter__done {
  color: var(--color-on-primary);
  background: var(--color-button-primary-bg);
}
.filter__done:hover {
  background: var(--color-button-primary-hover);
}

.filter-pop-enter-active,
.filter-pop-leave-active {
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;
}
.filter-pop-enter-from,
.filter-pop-leave-to {
  opacity: 0;
  transform: scale(0.97) translateY(-4px);
}
</style>
