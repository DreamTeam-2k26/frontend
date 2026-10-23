<script setup>
import { computed, nextTick, useTemplateRef } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useForm } from '@/composables/useForm'
import { CATEGORIES } from '@/utils/kanban'
import { required } from '@/utils/validators'

const NAME_MAX = 50

const {
  column = null,
  saving = false,
  fieldErrors = {},
} = defineProps({
  // Coluna existente para renomear; sem ela, cria uma nova.
  column: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  fieldErrors: { type: Object, default: () => ({}) },
})

const emit = defineEmits({
  submit: (payload) => Boolean(payload?.name),
  close: null,
})

const form = useTemplateRef('form')
const editing = computed(() => Boolean(column))
const { values, errors, validateField, handleSubmit } = useForm(
  { name: column?.name ?? '', category: column?.category ?? 'todo' },
  {
    name: [
      required('Informe o nome da coluna.'),
      (value) => (value.trim().length > NAME_MAX ? `Use no máximo ${NAME_MAX} caracteres.` : ''),
    ],
  },
)

const submit = handleSubmit((data) => {
  if (!saving) emit('submit', { name: data.name.trim(), category: data.category })
})

function save() {
  submit()
  nextTick(() => form.value?.querySelector('[aria-invalid="true"]')?.focus())
}
</script>

<template>
  <BaseModal
    :title="editing ? 'Renomear coluna' : 'Nova coluna'"
    size="sm"
    @close="!saving && emit('close')"
  >
    <form
      ref="form"
      id="column-form"
      class="column-form"
      novalidate
      :aria-busy="saving"
      @submit.prevent="save"
    >
      <BaseInput
        v-model="values.name"
        label="Nome da coluna"
        name="name"
        required
        :maxlength="NAME_MAX"
        autofocus
        :disabled="saving"
        :error="errors.name || fieldErrors.name"
        @blur="validateField('name')"
      />
      <label v-if="!editing" class="column-form__field">
        <span class="column-form__label">Categoria</span>
        <select
          v-model="values.category"
          name="category"
          :disabled="saving"
          class="column-form__select"
        >
          <option v-for="category in CATEGORIES" :key="category.value" :value="category.value">
            {{ category.label }}
          </option>
        </select>
        <small class="column-form__hint">
          Define como a coluna conta no progresso. Não pode ser alterada depois.
        </small>
        <small v-if="fieldErrors.category" class="column-form__error">{{
          fieldErrors.category
        }}</small>
      </label>
    </form>
    <template #footer>
      <BaseButton variant="ghost" :disabled="saving" @click="emit('close')">Cancelar</BaseButton>
      <BaseButton type="submit" form="column-form" :loading="saving">
        {{ editing ? 'Salvar' : 'Criar coluna' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.column-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.column-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.column-form__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
.column-form__select {
  min-height: calc(var(--space-10) + var(--space-1));
  padding: var(--space-2) var(--space-3);
  color: var(--color-text);
}
.column-form__hint {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.column-form__error {
  color: var(--color-danger);
  font-size: var(--font-size-xs);
}
</style>
