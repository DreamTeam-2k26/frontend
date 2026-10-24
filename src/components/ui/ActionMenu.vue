<script setup>
import { computed, shallowRef, useId, useTemplateRef } from 'vue'
import { Check, ChevronRight, Ellipsis } from 'lucide-vue-next'
import { useFloating } from '@/composables/useFloating'

// Menu "⋯" no estilo do GitHub: ícone, atalho, separadores e submenu (ex.: "Mover para coluna ›").
// A lista é teleportada (fica acima de cards vizinhos e fora de áreas com rolagem).
const {
  label,
  items,
  align = 'end',
} = defineProps({
  // Nome acessível do botão (ex.: "Ações da tarefa Revisar texto").
  label: { type: String, required: true },
  // [{ id, label, icon?, danger?, disabled?, shortcut?, checked?, children?: [...] } | { id, separator: true }]
  items: { type: Array, required: true },
  align: { type: String, default: 'end', validator: (value) => ['start', 'end'].includes(value) },
})

const emit = defineEmits({ select: (id) => id != null })

const menuId = useId()
const trigger = useTemplateRef('trigger')
const list = useTemplateRef('list')
const subList = useTemplateRef('subList')
const subTrigger = shallowRef(null)
const subItems = shallowRef([])

const menu = useFloating(trigger, list, { align })
const submenu = useFloating(subTrigger, subList, { side: 'right' })
const actionable = computed(() => items.filter((item) => !item.separator && !item.disabled))

const buttonsIn = (element) => [
  ...(element?.querySelectorAll('[role="menuitem"]:not(:disabled), [role="menuitemradio"]') ?? []),
]

function focusIn(element, index) {
  const buttons = buttonsIn(element)
  buttons[(index + buttons.length) % buttons.length]?.focus()
}

function onOutside(event) {
  const inside = [trigger.value, list.value, subList.value].some((element) =>
    element?.contains(event.target),
  )
  if (!inside) close(false)
}

async function show() {
  await menu.show()
  document.addEventListener('pointerdown', onOutside, true)
  focusIn(list.value, 0)
}

function close(returnFocus = true) {
  closeSubmenu(false)
  menu.hide()
  document.removeEventListener('pointerdown', onOutside, true)
  if (returnFocus) trigger.value?.focus()
}

function toggle() {
  if (menu.open.value) close()
  else show()
}

async function openSubmenu(item, event, focusFirst = false) {
  if (subTrigger.value === event.currentTarget && submenu.open.value) {
    if (focusFirst) focusIn(subList.value, 0)
    return
  }
  subTrigger.value = event.currentTarget
  subItems.value = item.children
  await submenu.show()
  if (focusFirst) focusIn(subList.value, 0)
}

function closeSubmenu(returnFocus = true) {
  if (!submenu.open.value) return
  submenu.hide()
  if (returnFocus) subTrigger.value?.focus()
}

function choose(item, event) {
  if (item.children) {
    openSubmenu(item, event, true)
    return
  }
  close()
  emit('select', item.id)
}

function onKeydown(event, isSubmenu) {
  const element = isSubmenu ? subList.value : list.value
  const buttons = buttonsIn(element)
  const index = buttons.indexOf(document.activeElement)
  const current = isSubmenu ? subItems.value : items
  const item = current.filter((entry) => !entry.separator && !entry.disabled)[index]

  if (event.key === 'ArrowDown') focusIn(element, index + 1)
  else if (event.key === 'ArrowUp') focusIn(element, index - 1)
  else if (event.key === 'Home') focusIn(element, 0)
  else if (event.key === 'End') focusIn(element, buttons.length - 1)
  else if (event.key === 'ArrowRight' && !isSubmenu && item?.children)
    openSubmenu(item, { currentTarget: document.activeElement }, true)
  else if ((event.key === 'ArrowLeft' || event.key === 'Escape') && isSubmenu) closeSubmenu()
  else if (event.key === 'Escape') close()
  else if (event.key === 'Tab') close(false)
  else return
  event.preventDefault()
  event.stopPropagation()
}

function onHover(item, event) {
  if (item.children) openSubmenu(item, event)
  else closeSubmenu(false)
}

defineExpose({ open: show })

const entryKey = (entry, index) => entry.id ?? `separator-${index}`
</script>

<template>
  <div class="action-menu" @pointerdown.stop>
    <button
      ref="trigger"
      type="button"
      class="action-menu__trigger"
      :class="{ 'action-menu__trigger--open': menu.open.value }"
      :aria-label="label"
      aria-haspopup="menu"
      :aria-expanded="menu.open.value"
      :aria-controls="menu.open.value ? menuId : undefined"
      :disabled="!actionable.length"
      @click.stop="toggle"
    >
      <slot name="trigger"><Ellipsis :size="18" aria-hidden="true" /></slot>
    </button>

    <Teleport :to="menu.teleportTo.value">
      <Transition name="menu-pop">
        <ul
          v-if="menu.open.value"
          :id="menuId"
          ref="list"
          class="action-menu__list"
          :class="`action-menu__list--${align}`"
          role="menu"
          :aria-label="label"
          :style="menu.style"
          @keydown="onKeydown($event, false)"
          @pointerdown.stop
          @click.stop
        >
          <template v-for="(item, index) in items" :key="entryKey(item, index)">
            <li v-if="item.separator" class="action-menu__separator" role="separator" />
            <li v-else role="none">
              <button
                type="button"
                role="menuitem"
                class="action-menu__item"
                :class="{ 'action-menu__item--danger': item.danger }"
                :disabled="item.disabled"
                :aria-haspopup="item.children ? 'menu' : undefined"
                :aria-expanded="
                  item.children ? submenu.open.value && subItems === item.children : undefined
                "
                @click="choose(item, $event)"
                @pointerenter="onHover(item, $event)"
              >
                <component
                  :is="item.icon"
                  v-if="item.icon"
                  class="action-menu__icon"
                  :size="16"
                  aria-hidden="true"
                />
                <span class="action-menu__label">{{ item.label }}</span>
                <kbd v-if="item.shortcut" class="action-menu__kbd">{{ item.shortcut }}</kbd>
                <ChevronRight
                  v-if="item.children"
                  class="action-menu__chevron"
                  :size="16"
                  aria-hidden="true"
                />
              </button>
            </li>
          </template>
        </ul>
      </Transition>
    </Teleport>

    <Teleport :to="menu.teleportTo.value">
      <Transition name="menu-pop">
        <ul
          v-if="submenu.open.value"
          ref="subList"
          class="action-menu__list action-menu__list--sub"
          role="menu"
          :style="submenu.style"
          @keydown="onKeydown($event, true)"
          @pointerdown.stop
          @click.stop
        >
          <li v-for="item in subItems" :key="item.id" role="none">
            <button
              type="button"
              role="menuitemradio"
              class="action-menu__item"
              :aria-checked="Boolean(item.checked)"
              :disabled="item.disabled"
              @click="choose(item, $event)"
            >
              <span class="action-menu__check" aria-hidden="true">
                <Check v-if="item.checked" :size="14" />
              </span>
              <span
                v-if="item.tone"
                class="action-menu__dot"
                :class="`action-menu__dot--${item.tone}`"
                aria-hidden="true"
              />
              <span class="action-menu__label">{{ item.label }}</span>
            </button>
          </li>
        </ul>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.action-menu {
  display: inline-flex;
}
.action-menu__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  min-height: 2rem;
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}
.action-menu__trigger:hover:not(:disabled),
.action-menu__trigger--open {
  color: var(--color-text);
  background: var(--color-bg-hover);
}
.action-menu__trigger:disabled {
  visibility: hidden;
}
.action-menu__list {
  position: fixed;
  z-index: var(--z-popover);
  min-width: 13rem;
  max-width: min(20rem, calc(100vw - 1rem));
  max-height: min(24rem, calc(100dvh - 1rem));
  overflow-y: auto;
  padding: var(--space-1);
  color: var(--color-text);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  transform-origin: top;
}
.action-menu__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-height: 2.25rem;
  padding: var(--space-1) var(--space-2);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  text-align: left;
  white-space: nowrap;
  border-radius: var(--radius-sm);
}
.action-menu__item:hover:not(:disabled),
.action-menu__item:focus-visible,
.action-menu__item[aria-expanded='true'] {
  background: var(--color-bg-hover);
}
.action-menu__item:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 1px var(--color-primary);
}
.action-menu__item:disabled {
  color: var(--color-disabled);
  cursor: not-allowed;
}
.action-menu__icon {
  color: var(--color-text-secondary);
}
.action-menu__item--danger,
.action-menu__item--danger .action-menu__icon {
  color: var(--color-danger);
}
.action-menu__item--danger:hover:not(:disabled) {
  background: var(--color-danger-soft);
}
.action-menu__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.action-menu__kbd {
  min-width: 1.5rem;
  padding: 0 var(--space-1);
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: var(--font-size-xs);
  text-align: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}
.action-menu__chevron {
  color: var(--color-text-secondary);
}
.action-menu__check {
  display: inline-flex;
  width: 1rem;
  color: var(--color-primary);
}
.action-menu__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: var(--radius-full);
  background: var(--color-status-todo);
}
.action-menu__dot--in_progress {
  background: var(--color-warning);
}
.action-menu__dot--done {
  background: var(--color-status-done);
}
.action-menu__separator {
  height: 1px;
  margin: var(--space-1) calc(-1 * var(--space-1));
  background: var(--color-border);
}

.menu-pop-enter-active,
.menu-pop-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}
.menu-pop-enter-from,
.menu-pop-leave-to {
  opacity: 0;
  transform: scale(0.97) translateY(-2px);
}
</style>
