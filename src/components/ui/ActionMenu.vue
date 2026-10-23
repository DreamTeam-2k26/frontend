<script setup>
import { computed, nextTick, onBeforeUnmount, shallowRef, useId, useTemplateRef } from 'vue'
import { Ellipsis } from 'lucide-vue-next'

// Menu "⋯": botão com aria-haspopup + lista de ações navegável por setas, Esc e clique fora.
const {
  label,
  items,
  align = 'end',
} = defineProps({
  // Nome acessível do botão (ex.: "Ações da tarefa Revisar texto").
  label: { type: String, required: true },
  // [{ id, label, icon?, danger?, disabled? }]
  items: { type: Array, required: true },
  align: { type: String, default: 'end', validator: (value) => ['start', 'end'].includes(value) },
})

const emit = defineEmits(['select'])

const open = shallowRef(false)
const menuId = useId()
const root = useTemplateRef('root')
const trigger = useTemplateRef('trigger')
const enabledItems = computed(() => items.filter((item) => !item.disabled))

function focusItem(index) {
  const buttons = root.value?.querySelectorAll('[role="menuitem"]:not(:disabled)') ?? []
  buttons[(index + buttons.length) % buttons.length]?.focus()
}

function onOutside(event) {
  if (!root.value?.contains(event.target)) close(false)
}

async function show() {
  open.value = true
  document.addEventListener('pointerdown', onOutside, true)
  await nextTick()
  focusItem(0)
}

function close(returnFocus = true) {
  open.value = false
  document.removeEventListener('pointerdown', onOutside, true)
  if (returnFocus) trigger.value?.focus()
}

function toggle() {
  if (open.value) close()
  else show()
}

function choose(item) {
  close()
  emit('select', item.id)
}

function onKeydown(event) {
  const buttons = [...(root.value?.querySelectorAll('[role="menuitem"]:not(:disabled)') ?? [])]
  const index = buttons.indexOf(document.activeElement)
  if (event.key === 'ArrowDown') focusItem(index + 1)
  else if (event.key === 'ArrowUp') focusItem(index - 1)
  else if (event.key === 'Home') focusItem(0)
  else if (event.key === 'End') focusItem(buttons.length - 1)
  else if (event.key === 'Escape') close()
  else if (event.key === 'Tab') close(false)
  else return
  event.preventDefault()
  event.stopPropagation()
}

onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside, true))
</script>

<template>
  <div ref="root" class="action-menu">
    <button
      ref="trigger"
      type="button"
      class="action-menu__trigger"
      :aria-label="label"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="open ? menuId : undefined"
      :disabled="!enabledItems.length"
      @click.stop="toggle"
      @pointerdown.stop
    >
      <slot name="trigger"><Ellipsis :size="18" aria-hidden="true" /></slot>
    </button>
    <ul
      v-if="open"
      :id="menuId"
      class="action-menu__list"
      :class="`action-menu__list--${align}`"
      role="menu"
      @keydown="onKeydown"
    >
      <li v-for="item in items" :key="item.id" role="none">
        <button
          type="button"
          role="menuitem"
          class="action-menu__item"
          :class="{ 'action-menu__item--danger': item.danger }"
          :disabled="item.disabled"
          @click.stop="choose(item)"
        >
          <component :is="item.icon" v-if="item.icon" :size="16" aria-hidden="true" />
          {{ item.label }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.action-menu {
  position: relative;
  display: inline-flex;
}

.action-menu__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.25rem;
  min-height: 2.25rem;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
}

.action-menu__trigger:hover:not(:disabled),
.action-menu__trigger[aria-expanded='true'] {
  color: var(--color-text);
  background: var(--color-bg-hover);
}

.action-menu__list {
  position: absolute;
  top: calc(100% + var(--space-1));
  z-index: 40;
  min-width: 12rem;
  padding: var(--space-1);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}

.action-menu__list--end {
  right: 0;
}

.action-menu__list--start {
  left: 0;
}

.action-menu__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-height: 2.5rem;
  padding: var(--space-2) var(--space-3);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  text-align: left;
  white-space: nowrap;
  border-radius: var(--radius-sm);
}

.action-menu__item:hover:not(:disabled),
.action-menu__item:focus-visible {
  background: var(--color-bg-hover);
}

.action-menu__item:focus-visible {
  outline-offset: -2px;
}

.action-menu__item:disabled {
  color: var(--color-disabled);
  cursor: not-allowed;
}

.action-menu__item--danger {
  color: var(--color-danger);
}
</style>
