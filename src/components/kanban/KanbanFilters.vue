<script setup>
import { computed } from 'vue'
import { Search, X } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { PRIORITIES, hasActiveFilters } from '@/utils/kanban'

const { filters, members, columns, shown, total } = defineProps({
  // { search, priority, assignee, column, due }
  filters: { type: Object, required: true },
  members: { type: Array, required: true },
  columns: { type: Array, required: true },
  shown: { type: Number, required: true },
  total: { type: Number, required: true },
})

// Emite só os campos alterados; a página grava na query da rota.
const emit = defineEmits({
  change: (patch) => patch && typeof patch === 'object',
  clear: null,
})

const active = computed(() => hasActiveFilters(filters))
const counter = computed(() =>
  active.value ? `${shown} de ${total} tarefas` : `${total} ${total === 1 ? 'tarefa' : 'tarefas'}`,
)

const selects = computed(() => [
  {
    key: 'priority',
    label: 'Prioridade',
    options: [{ value: '', label: 'Todas' }, ...PRIORITIES],
  },
  {
    key: 'assignee',
    label: 'Responsável',
    options: [
      { value: '', label: 'Todos' },
      { value: 'none', label: 'Sem responsável' },
      ...members.map((member) => ({
        value: String(member.user),
        label: member.user_name || member.user_email,
      })),
    ],
  },
  {
    key: 'column',
    label: 'Coluna',
    options: [
      { value: '', label: 'Todas' },
      ...columns.map((column) => ({ value: String(column.id), label: column.name })),
    ],
  },
  {
    key: 'due',
    label: 'Prazo',
    options: [
      { value: '', label: 'Todos' },
      { value: 'overdue', label: 'Atrasadas' },
      { value: 'no_date', label: 'Sem prazo' },
    ],
  },
])
</script>

<template>
  <div class="kanban-filters" role="search" aria-label="Filtrar tarefas">
    <div class="kanban-filters__search">
      <BaseInput
        :model-value="filters.search"
        label="Buscar"
        type="search"
        placeholder="Buscar pelo título…"
        autocomplete="off"
        :icon="Search"
        @update:model-value="emit('change', { search: $event })"
      />
    </div>
    <label v-for="select in selects" :key="select.key" class="kanban-filters__field">
      <span class="kanban-filters__label">{{ select.label }}</span>
      <select
        class="kanban-filters__select"
        :value="filters[select.key]"
        @change="emit('change', { [select.key]: $event.target.value })"
      >
        <option v-for="option in select.options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </label>
    <div class="kanban-filters__summary">
      <p class="kanban-filters__counter" aria-live="polite">{{ counter }}</p>
      <BaseButton v-if="active" variant="ghost" @click="emit('clear')">
        <X :size="16" aria-hidden="true" /> Limpar filtros
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.kanban-filters {
  display: grid;
  grid-template-columns: minmax(14rem, 2fr) repeat(4, minmax(8.5rem, 1fr));
  align-items: end;
  gap: var(--space-3);
}
.kanban-filters__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}
.kanban-filters__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
.kanban-filters__select {
  min-height: calc(var(--space-10) + var(--space-1));
  padding: var(--space-2) var(--space-3);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.kanban-filters__select:hover {
  border-color: var(--color-primary);
}
.kanban-filters__summary {
  display: flex;
  grid-column: 1 / -1;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  min-height: 2.75rem;
}
.kanban-filters__counter {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
@media (max-width: 1100px) {
  .kanban-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .kanban-filters__search {
    grid-column: 1 / -1;
  }
}
</style>
