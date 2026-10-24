<script setup>
import { computed, shallowRef, useId, useTemplateRef } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'
import UserAvatar from '@/components/user/UserAvatar.vue'
import { useFloating } from '@/composables/useFloating'

// Seleção com lista própria (no lugar do <select> nativo): ponto de status, avatar ou ícone por opção,
// teclado completo (setas, Home/End, Enter, Esc e busca pela primeira letra).
const model = defineModel({ type: [String, Number, null], default: null })

const {
  label,
  options,
  placeholder = 'Selecionar',
  variant = 'field',
  hideLabel = false,
  disabled = false,
  invalid = false,
  display = '',
  icon = undefined,
} = defineProps({
  label: { type: String, required: true },
  // [{ value, label, dot?: tom, avatar?: { name, src }, icon?, description? }]
  options: { type: Array, required: true },
  placeholder: { type: String, default: 'Selecionar' },
  // field: campo de formulário; pill: propriedade compacta; ghost: valor em linha (detalhe da tarefa);
  // toolbar: botão da barra do quadro (Agrupar, Ordenar)
  variant: {
    type: String,
    default: 'field',
    validator: (value) => ['field', 'pill', 'ghost', 'toolbar'].includes(value),
  },
  hideLabel: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  // Texto do botão diferente do rótulo da opção (ex.: opção "Por prazo", botão "Ordenar por prazo").
  display: { type: String, default: '' },
  // Ícone fixo do botão (as opções ficam só com texto).
  icon: { type: [Object, Function], default: undefined },
})

const emit = defineEmits({ change: () => true })

const ids = { button: useId(), label: useId(), list: useId() }
const button = useTemplateRef('button')
const list = useTemplateRef('list')
const floating = useFloating(button, list)
const active = shallowRef(-1)

const selectedIndex = computed(() => options.findIndex((option) => option.value === model.value))
const selected = computed(() => options[selectedIndex.value] ?? null)
const optionId = (index) => `${ids.list}-${index}`

function onOutside(event) {
  if (!button.value?.contains(event.target) && !list.value?.contains(event.target)) close(false)
}

async function open() {
  if (disabled) return
  active.value = Math.max(selectedIndex.value, 0)
  await floating.show()
  document.addEventListener('pointerdown', onOutside, true)
  scrollActive()
}

function close(returnFocus = true) {
  floating.hide()
  document.removeEventListener('pointerdown', onOutside, true)
  if (returnFocus) button.value?.focus()
}

function pick(index) {
  const option = options[index]
  if (!option) return
  const changed = option.value !== model.value
  model.value = option.value
  close()
  if (changed) emit('change', option.value)
}

// Rola só a lista (scrollIntoView poderia rolar a página e fechar a lista).
function scrollActive() {
  const box = list.value
  const option = box?.querySelector(`#${CSS.escape(optionId(active.value))}`)
  if (!box || !option) return
  if (option.offsetTop < box.scrollTop) box.scrollTop = option.offsetTop
  else if (option.offsetTop + option.offsetHeight > box.scrollTop + box.clientHeight)
    box.scrollTop = option.offsetTop + option.offsetHeight - box.clientHeight
}

function move(to) {
  active.value = (to + options.length) % options.length
  scrollActive()
}

function onKeydown(event) {
  const isOpen = floating.open.value
  const key = event.key
  if (!isOpen && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(key)) {
    event.preventDefault()
    open()
    return
  }
  if (!isOpen) return
  if (key === 'ArrowDown') move(active.value + 1)
  else if (key === 'ArrowUp') move(active.value - 1)
  else if (key === 'Home') move(0)
  else if (key === 'End') move(options.length - 1)
  else if (key === 'Enter' || key === ' ') pick(active.value)
  else if (key === 'Escape') close()
  else if (key === 'Tab') close(false)
  else if (key.length === 1) {
    // Busca pela primeira letra, a partir da opção seguinte.
    const letter = key.toLocaleLowerCase('pt-BR')
    const order = options.map((_, index) => (active.value + 1 + index) % options.length)
    const found = order.find((index) =>
      String(options[index].label).toLocaleLowerCase('pt-BR').startsWith(letter),
    )
    if (found !== undefined) move(found)
    return
  } else return
  event.preventDefault()
  event.stopPropagation()
}

function toggle() {
  if (floating.open.value) close()
  else open()
}
</script>

<template>
  <div class="select" :class="`select--${variant}`">
    <span :id="ids.label" class="select__label" :class="{ 'visually-hidden': hideLabel }">
      {{ label }}
    </span>
    <button
      :id="ids.button"
      ref="button"
      type="button"
      class="select__button"
      :class="{ 'select__button--open': floating.open.value, 'select__button--invalid': invalid }"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="floating.open.value"
      :aria-controls="floating.open.value ? ids.list : undefined"
      :aria-labelledby="`${ids.label} ${ids.button}`"
      :aria-activedescendant="floating.open.value && active >= 0 ? optionId(active) : undefined"
      :aria-invalid="invalid || undefined"
      :disabled="disabled"
      @click="toggle"
      @keydown="onKeydown"
    >
      <span class="select__value">
        <template v-if="display">
          <component :is="icon" v-if="icon" :size="15" aria-hidden="true" />
          <span class="select__text">{{ display }}</span>
        </template>
        <template v-else-if="selected">
          <span
            v-if="selected.dot"
            class="select__dot"
            :class="`select__dot--${selected.dot}`"
            aria-hidden="true"
          />
          <UserAvatar
            v-else-if="selected.avatar"
            class="select__avatar"
            :name="selected.avatar.name"
            :src="selected.avatar.src"
            size="sm"
          />
          <component :is="selected.icon" v-else-if="selected.icon" :size="15" aria-hidden="true" />
          <span class="select__text">{{ selected.label }}</span>
        </template>
        <span v-else class="select__placeholder">{{ placeholder }}</span>
      </span>
      <ChevronDown class="select__chevron" :size="15" aria-hidden="true" />
    </button>

    <Teleport :to="floating.teleportTo.value">
      <Transition name="select-pop">
        <ul
          v-if="floating.open.value"
          :id="ids.list"
          ref="list"
          class="select__list"
          role="listbox"
          :aria-labelledby="ids.label"
          :style="floating.style"
          @pointerdown.stop
        >
          <li
            v-for="(option, index) in options"
            :id="optionId(index)"
            :key="String(option.value)"
            class="select__option"
            :class="{ 'select__option--active': index === active }"
            role="option"
            :aria-selected="index === selectedIndex"
            @pointermove="active = index"
            @click="pick(index)"
          >
            <span
              v-if="option.dot"
              class="select__dot"
              :class="`select__dot--${option.dot}`"
              aria-hidden="true"
            />
            <UserAvatar
              v-else-if="option.avatar"
              class="select__avatar"
              :name="option.avatar.name"
              :src="option.avatar.src"
              size="sm"
            />
            <component :is="option.icon" v-else-if="option.icon" :size="15" aria-hidden="true" />
            <span class="select__option-text">
              {{ option.label }}
              <small v-if="option.description">{{ option.description }}</small>
            </span>
            <Check
              v-if="index === selectedIndex"
              class="select__check"
              :size="15"
              aria-hidden="true"
            />
          </li>
        </ul>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.select {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}
.select__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
.select__button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  width: 100%;
  min-height: 2.75rem;
  padding: var(--space-2) var(--space-3);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  text-align: left;
  background: var(--color-input-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}
.select__button:hover:not(:disabled) {
  border-color: var(--color-primary);
}
.select__button:focus-visible,
.select__button--open {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
  background: var(--color-input-bg);
}
.select__button--invalid {
  border-color: var(--color-danger);
}
.select__value {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}
.select__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.select__placeholder {
  color: var(--color-text-secondary);
}
.select__chevron {
  flex-shrink: 0;
  color: var(--color-text-secondary);
  transition: transform 0.15s ease;
}
.select__button--open .select__chevron {
  transform: rotate(180deg);
}
.select__avatar {
  width: 1.375rem;
  height: 1.375rem;
  font-size: 0.625rem;
}

/* Pílula: propriedade compacta (formulário de nova tarefa, barra de ferramentas). */
.select--pill .select__button {
  width: auto;
  min-height: 2.25rem;
  padding: var(--space-1) var(--space-3);
  border-color: var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-bg-card);
}
/* Barra do quadro: mesmo visual do botão Filtrar. */
.select--toolbar .select__button {
  width: auto;
  min-height: 2.5rem;
  padding: 0 var(--space-3);
  font-weight: var(--font-weight-semibold);
  background: var(--color-bg-card);
  border-color: var(--color-border);
}
.select--toolbar .select__button:hover:not(:disabled) {
  background: var(--color-bg-hover);
}
/* Em linha: valor sem caixa, como no detalhe da tarefa; a caixa aparece no hover/foco. */
.select--ghost {
  margin-left: calc(-1 * var(--space-2));
}
.select--ghost .select__button {
  width: auto;
  max-width: 100%;
  min-height: 2.25rem;
  padding: var(--space-1) var(--space-2);
  background: transparent;
  border-color: transparent;
}
.select--ghost .select__button:hover:not(:disabled) {
  background: var(--color-bg-hover);
  border-color: transparent;
}
.select--ghost .select__chevron {
  opacity: 0;
}
.select--ghost .select__button:hover .select__chevron,
.select--ghost .select__button:focus-visible .select__chevron,
.select--ghost .select__button--open .select__chevron {
  opacity: 1;
}

.select__list {
  position: fixed;
  z-index: var(--z-popover);
  max-width: min(22rem, calc(100vw - 1rem));
  max-height: min(18rem, calc(100dvh - 1rem));
  overflow-y: auto;
  padding: var(--space-1);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  transform-origin: top;
}
.select__option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 2.25rem;
  padding: var(--space-1) var(--space-2);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.select__option--active {
  background: var(--color-bg-hover);
}
.select__option-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
.select__option-text small {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.select__check {
  color: var(--color-primary);
}
.select__dot {
  flex-shrink: 0;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: var(--radius-full);
  background: var(--color-status-todo);
}
.select__dot--in_progress {
  background: var(--color-warning);
}
.select__dot--done {
  background: var(--color-status-done);
}
.select__dot--high {
  background: var(--color-danger);
}
.select__dot--medium {
  background: var(--color-warning);
}
.select__dot--low {
  background: var(--color-success);
}

.select-pop-enter-active,
.select-pop-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}
.select-pop-enter-from,
.select-pop-leave-to {
  opacity: 0;
  transform: scale(0.98) translateY(-2px);
}
</style>
