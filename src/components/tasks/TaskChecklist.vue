<script setup>
import { computed, nextTick, ref, useId } from 'vue'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import ActionMenu from '@/components/ui/ActionMenu.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useTaskDetailStore } from '@/stores/taskDetail'
import { checklistPercent } from '@/utils/kanban'

const TEXT_MAX = 255

// Seção do modal de detalhe: lê e altera o checklist da tarefa aberta.
const detail = useTaskDetailStore()

const ids = { title: useId(), add: useId() }
const adding = ref(false)
const newText = ref('')
const addError = ref('')
const addBusy = ref(false)
const addInput = ref(null)
const editingId = ref(null)
const editText = ref('')
const editInput = ref(null)

const total = computed(() => detail.checklist.length)
const percent = computed(() => checklistPercent(detail.checklistDone, total.value))

const menuItems = (index) => [
  { id: 'rename', label: 'Renomear', icon: Pencil },
  { id: 'up', label: 'Mover para cima', icon: ArrowUp, disabled: index === 0 },
  { id: 'down', label: 'Mover para baixo', icon: ArrowDown, disabled: index === total.value - 1 },
  { id: 'delete', label: 'Excluir item', icon: Trash2, danger: true },
]

const validate = (text) => {
  if (!text) return 'Escreva o item.'
  if (text.length > TEXT_MAX) return `Use no máximo ${TEXT_MAX} caracteres.`
  return ''
}

async function openAdd() {
  adding.value = true
  await nextTick()
  addInput.value?.focus()
}

function closeAdd() {
  adding.value = false
  newText.value = ''
  addError.value = ''
}

// Enter adiciona e mantém o campo aberto para o próximo item; erro preserva o texto.
async function submitAdd() {
  const text = newText.value.trim()
  addError.value = validate(text)
  if (addError.value || addBusy.value) return
  addBusy.value = true
  try {
    await detail.addItem(text)
    newText.value = ''
  } catch {
    // Toast exibido pela store.
  } finally {
    addBusy.value = false
    await nextTick()
    addInput.value?.focus()
  }
}

async function startEdit(item) {
  editingId.value = item.id
  editText.value = item.text
  await nextTick()
  editInput.value?.[0]?.focus()
}

async function commitEdit(item) {
  if (editingId.value !== item.id) return
  const text = editText.value.trim()
  if (validate(text) || text === item.text) {
    editingId.value = null
    return
  }
  try {
    await detail.renameItem(item, text)
    editingId.value = null
  } catch {
    // Mantém o campo aberto com o texto digitado.
  }
}

function onMenu(item, action) {
  if (action === 'rename') startEdit(item)
  else if (action === 'up') detail.moveItem(item, -1).catch(() => {})
  else if (action === 'down') detail.moveItem(item, 1).catch(() => {})
  else if (action === 'delete') detail.removeItem(item).catch(() => {})
}
</script>

<template>
  <section class="checklist" :aria-labelledby="ids.title">
    <header class="checklist__header">
      <h3 :id="ids.title" class="checklist__title">
        Checklist <span class="checklist__count">({{ detail.checklistDone }}/{{ total }})</span>
      </h3>
      <span v-if="total" class="checklist__percent">{{ percent }}%</span>
    </header>

    <div
      v-if="total"
      class="checklist__bar"
      role="progressbar"
      :aria-valuenow="percent"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="`Checklist ${percent}% concluído`"
    >
      <span class="checklist__bar-fill" :style="{ width: `${percent}%` }" />
    </div>

    <ul v-if="total" class="checklist__list">
      <li
        v-for="(item, index) in detail.checklist"
        :key="item.id"
        class="checklist__item"
        :class="{ 'checklist__item--done': item.is_done }"
      >
        <template v-if="editingId === item.id">
          <label :for="`${ids.add}-edit-${item.id}`" class="visually-hidden">Texto do item</label>
          <input
            :id="`${ids.add}-edit-${item.id}`"
            ref="editInput"
            v-model="editText"
            class="checklist__input"
            :maxlength="TEXT_MAX"
            @keydown.enter.prevent="commitEdit(item)"
            @keydown.esc.stop.prevent="editingId = null"
            @blur="commitEdit(item)"
          />
        </template>
        <template v-else>
          <input
            :id="`${ids.add}-item-${item.id}`"
            type="checkbox"
            class="checklist__check"
            :checked="item.is_done"
            @change="detail.toggleItem(item).catch(() => {})"
          />
          <label
            :for="`${ids.add}-item-${item.id}`"
            class="checklist__text"
            @dblclick.prevent="startEdit(item)"
          >
            {{ item.text }}
          </label>
          <ActionMenu
            :label="`Ações do item ${item.text}`"
            :items="menuItems(index)"
            @select="onMenu(item, $event)"
          />
        </template>
      </li>
    </ul>
    <p v-else-if="!adding" class="checklist__empty">Nenhum item no checklist.</p>

    <form v-if="adding" class="checklist__add-form" novalidate @submit.prevent="submitAdd">
      <label :for="ids.add" class="visually-hidden">Novo item do checklist</label>
      <input
        :id="ids.add"
        ref="addInput"
        v-model="newText"
        class="checklist__input"
        placeholder="Descreva o item e pressione Enter"
        :maxlength="TEXT_MAX"
        :aria-invalid="Boolean(addError)"
        :aria-describedby="addError ? `${ids.add}-error` : undefined"
        @keydown.esc.stop.prevent="closeAdd"
      />
      <BaseButton type="submit" :loading="addBusy">Adicionar</BaseButton>
      <BaseButton variant="ghost" @click="closeAdd">Cancelar</BaseButton>
      <small v-if="addError" :id="`${ids.add}-error`" class="checklist__error">{{
        addError
      }}</small>
    </form>
    <button v-else type="button" class="checklist__add" @click="openAdd">
      <Plus :size="16" aria-hidden="true" /> Adicionar item
    </button>
  </section>
</template>

<style scoped>
.checklist {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.checklist__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.checklist__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.checklist__count,
.checklist__percent {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-regular);
}
.checklist__bar {
  height: 0.375rem;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--color-bg-subtle);
}
.checklist__bar-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-status-done);
  transition: width 0.2s ease;
}
.checklist__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.checklist__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 2.5rem;
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
}
.checklist__item:hover {
  background: var(--color-bg-hover);
}
.checklist__check {
  flex-shrink: 0;
  width: 1.125rem;
  height: 1.125rem;
  cursor: pointer;
}
.checklist__text {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-sm);
  overflow-wrap: anywhere;
  cursor: pointer;
}
.checklist__item--done .checklist__text {
  color: var(--color-text-secondary);
  text-decoration: line-through;
}
.checklist__input {
  flex: 1;
  min-width: 0;
  min-height: 2.5rem;
  padding: var(--space-1) var(--space-3);
  color: var(--color-text);
  font-size: var(--font-size-sm);
}
.checklist__input[aria-invalid='true'] {
  border-color: var(--color-danger);
}
.checklist__empty {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.checklist__add-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}
.checklist__add {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: var(--space-2);
  min-height: 2.5rem;
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.checklist__add:hover {
  background: var(--color-bg-hover);
}
.checklist__error {
  flex-basis: 100%;
  color: var(--color-danger);
  font-size: var(--font-size-xs);
}
</style>
