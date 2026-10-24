<script setup>
import { computed, useId } from 'vue'
import { ArrowDownUp, Rows3, Search, X } from 'lucide-vue-next'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import KanbanFilterPopover from '@/components/kanban/KanbanFilterPopover.vue'
import { GROUPS, SORTS, hasActiveFilters } from '@/utils/kanban'

const { filters, members, columns, group, sort, shown, total } = defineProps({
  // { search, priority, assignee, column, due }
  filters: { type: Object, required: true },
  members: { type: Array, required: true },
  columns: { type: Array, required: true },
  group: { type: String, required: true },
  sort: { type: String, required: true },
  shown: { type: Number, required: true },
  total: { type: Number, required: true },
})

// Emite só o que mudou; a página grava tudo na query da rota.
const emit = defineEmits({
  change: (patch) => patch && typeof patch === 'object',
  clear: null,
})

const searchId = useId()
const active = computed(() => hasActiveFilters(filters))
const counter = computed(() =>
  active.value ? `${shown} de ${total} tarefas` : `${total} ${total === 1 ? 'tarefa' : 'tarefas'}`,
)
const groupButton = computed(() => GROUPS.find((option) => option.value === group)?.button)
const sortButton = computed(() => SORTS.find((option) => option.value === sort)?.button)
</script>

<template>
  <div class="toolbar" role="search" aria-label="Buscar e organizar tarefas">
    <label :for="searchId" class="toolbar__search">
      <Search class="toolbar__search-icon" :size="16" aria-hidden="true" />
      <span class="visually-hidden">Buscar tarefas</span>
      <input
        :id="searchId"
        class="toolbar__search-input"
        type="search"
        placeholder="Buscar tarefas…"
        autocomplete="off"
        :value="filters.search"
        @input="emit('change', { search: $event.target.value })"
        @keydown.esc="$event.target.value && emit('change', { search: '' })"
      />
    </label>

    <KanbanFilterPopover
      :filters="filters"
      :members="members"
      :columns="columns"
      @change="emit('change', $event)"
      @clear="emit('clear')"
    />
    <BaseSelect
      :model-value="group"
      label="Agrupar"
      hide-label
      variant="toolbar"
      :display="groupButton"
      :icon="Rows3"
      :options="GROUPS"
      @change="emit('change', { group: $event })"
    />
    <BaseSelect
      :model-value="sort"
      label="Ordenar"
      hide-label
      variant="toolbar"
      :display="sortButton"
      :icon="ArrowDownUp"
      :options="SORTS"
      @change="emit('change', { sort: $event })"
    />

    <div class="toolbar__summary">
      <p class="toolbar__counter" aria-live="polite">{{ counter }}</p>
      <button v-if="active" type="button" class="toolbar__clear" @click="emit('clear')">
        <X :size="14" aria-hidden="true" /> Limpar
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}
.toolbar__search {
  position: relative;
  display: flex;
  flex: 0 1 20rem;
  align-items: center;
  min-width: 12rem;
}
.toolbar__search-icon {
  position: absolute;
  left: var(--space-3);
  color: var(--color-text-secondary);
  pointer-events: none;
}
.toolbar__search-input {
  width: 100%;
  min-height: 2.5rem;
  padding: 0 var(--space-3) 0 2.25rem;
  color: var(--color-text);
  font-size: var(--font-size-sm);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}
.toolbar__search-input:hover {
  border-color: var(--color-secondary);
}
.toolbar__search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}
.toolbar__summary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
}
.toolbar__counter {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}
.toolbar__clear {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 2rem;
  padding: 0 var(--space-2);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-sm);
}
.toolbar__clear:hover {
  background: var(--color-bg-hover);
}
@media (max-width: 700px) {
  .toolbar__search {
    flex-basis: 100%;
  }
  .toolbar__summary {
    flex-basis: 100%;
    margin-left: 0;
  }
}
</style>
