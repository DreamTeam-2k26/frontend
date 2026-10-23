<script setup>
import { shallowRef, useId, useTemplateRef, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import { CATEGORIES } from '@/utils/kanban'

const NAME_MAX = 50

// Nova coluna direto no quadro: o botão se abre num cartão com nome e categoria.
const open = defineModel('open', { type: Boolean, default: false })

const { saving = false, error = '' } = defineProps({
  saving: { type: Boolean, default: false },
  // Erro do servidor para o nome (ex.: nome repetido).
  error: { type: String, default: '' },
})

const emit = defineEmits({
  create: (payload) => Boolean(payload?.name && payload?.category),
})

const ids = { name: useId(), category: useId() }
const nameInput = useTemplateRef('nameInput')
const name = shallowRef('')
const category = shallowRef('todo')
const localError = shallowRef('')

watch(open, (isOpen) => {
  if (!isOpen) return
  name.value = ''
  category.value = 'todo'
  localError.value = ''
})

// Depois da animação de entrada: traz o cartão para a área visível do quadro e foca o nome.
function onEntered(element) {
  if (!open.value) return
  element.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  nameInput.value?.focus({ preventScroll: true })
}

function submit() {
  const value = name.value.trim()
  localError.value = !value
    ? 'Dê um nome para a coluna.'
    : value.length > NAME_MAX
      ? `Use no máximo ${NAME_MAX} caracteres.`
      : ''
  if (localError.value || saving) {
    nameInput.value?.focus()
    return
  }
  emit('create', { name: value, category: category.value })
}
</script>

<template>
  <div class="composer">
    <Transition name="composer" mode="out-in" @after-enter="onEntered">
      <button v-if="!open" type="button" class="composer__open" @click="open = true">
        <Plus :size="18" aria-hidden="true" /> Nova coluna
      </button>

      <form
        v-else
        class="composer__card"
        novalidate
        :aria-busy="saving"
        @submit.prevent="submit"
        @keydown.esc.stop="!saving && (open = false)"
      >
        <label :for="ids.name" class="composer__label">Nome da coluna</label>
        <input
          :id="ids.name"
          ref="nameInput"
          v-model="name"
          class="composer__input"
          placeholder="Ex.: Em revisão"
          :maxlength="NAME_MAX"
          :disabled="saving"
          :aria-invalid="Boolean(localError || error)"
          :aria-describedby="localError || error ? `${ids.name}-error` : `${ids.category}-hint`"
        />
        <small v-if="localError || error" :id="`${ids.name}-error`" class="composer__error">
          {{ localError || error }}
        </small>

        <fieldset class="composer__categories">
          <legend class="composer__label">Conta como</legend>
          <div class="composer__segments">
            <label
              v-for="option in CATEGORIES"
              :key="option.value"
              class="composer__segment"
              :class="{ 'composer__segment--on': category === option.value }"
            >
              <input
                v-model="category"
                class="visually-hidden"
                type="radio"
                :name="ids.category"
                :value="option.value"
                :disabled="saving"
              />
              <span
                class="composer__dot"
                :class="`composer__dot--${option.value}`"
                aria-hidden="true"
              />
              {{ option.label }}
            </label>
          </div>
          <small :id="`${ids.category}-hint`" class="composer__hint">
            Define o progresso do projeto. Não muda depois.
          </small>
        </fieldset>

        <div class="composer__actions">
          <BaseButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</BaseButton>
          <BaseButton type="submit" :loading="saving">Criar coluna</BaseButton>
        </div>
      </form>
    </Transition>
  </div>
</template>

<style scoped>
.composer {
  flex: 0 0 auto;
}
.composer__open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 15rem;
  min-height: 3.25rem;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background-color 0.15s ease;
}
.composer__open:hover {
  color: var(--color-primary-hover);
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 6%, transparent);
}
.composer__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 21rem;
  max-width: calc(100vw - 3rem);
  padding: var(--space-4);
  background: var(--color-bg-card);
  border: 1px solid color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  transform-origin: left top;
}
.composer__label {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.composer__input {
  min-height: 2.5rem;
  padding: 0 var(--space-3);
  color: var(--color-text);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  background: var(--color-bg-subtle);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
}
.composer__input:focus {
  outline: none;
  background: var(--color-input-bg);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}
.composer__input[aria-invalid='true'] {
  border-color: var(--color-danger);
}
.composer__error {
  color: var(--color-danger);
  font-size: var(--font-size-xs);
}
.composer__categories {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-2);
  padding: 0;
  border: 0;
}
.composer__categories legend {
  margin-bottom: var(--space-2);
}
/* Controle segmentado (estilo iOS) para a categoria. */
.composer__segments {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.125rem;
  padding: 0.1875rem;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
}
.composer__segment {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  min-height: 2rem;
  padding: 0 var(--space-1);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  border-radius: calc(var(--radius-md) - 0.1875rem);
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;
}
.composer__segment--on {
  color: var(--color-text);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-sm);
}
.composer__segment:has(:focus-visible) {
  outline: var(--focus-ring);
  outline-offset: 1px;
}
.composer__dot {
  width: 0.4375rem;
  height: 0.4375rem;
  border-radius: var(--radius-full);
  background: var(--color-status-todo);
}
.composer__dot--in_progress {
  background: var(--color-warning);
}
.composer__dot--done {
  background: var(--color-status-done);
}
.composer__hint {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.composer__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.composer-enter-active {
  animation: composer-grow 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}
.composer-leave-active {
  transition: opacity 0.1s ease;
}
.composer-leave-to {
  opacity: 0;
}
@keyframes composer-grow {
  from {
    opacity: 0;
    transform: scale(0.85, 0.6);
  }
}
</style>
