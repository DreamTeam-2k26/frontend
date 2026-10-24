<script setup>
import { computed, nextTick, useId, useTemplateRef } from 'vue'
import { Link2Off } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useForm } from '@/composables/useForm'
import { TITLE_MAX, URL_MAX, linkRules } from '@/utils/supportLinks'

// Criar ou editar um link de apoio. Com `tasks`, permite vincular a uma tarefa do projeto ou
// desvincular (task null). O pai faz a chamada e devolve os erros 400 em `fieldErrors`.
const {
  link = null,
  task = null,
  tasks = null,
  saving = false,
  fieldErrors = {},
} = defineProps({
  // Link em edição; null cria.
  link: { type: Object, default: null },
  // Tarefa inicial ao criar (detalhe da tarefa) ou null (link geral).
  task: { type: Number, default: null },
  // [{ id, title }] do mesmo projeto; null esconde o campo Tarefa.
  tasks: { type: Array, default: null },
  saving: { type: Boolean, default: false },
  fieldErrors: { type: Object, default: () => ({}) },
})

const emit = defineEmits({
  submit: (payload) => Boolean(payload?.title && payload?.url),
  close: null,
})

const form = useTemplateRef('form')
const formId = useId()

const { values, errors, validateField, handleSubmit } = useForm(
  {
    title: link?.title ?? '',
    url: link?.url ?? '',
    task: link ? link.task : task,
  },
  linkRules,
)

const taskOptions = computed(() => [
  { value: null, label: 'Nenhuma (link geral do projeto)', icon: Link2Off },
  ...(tasks ?? []).map((item) => ({ value: item.id, label: item.title })),
])

const submit = handleSubmit((data) => {
  if (saving) return
  const payload = { title: data.title.trim(), url: data.url.trim() }
  if (tasks) payload.task = data.task
  emit('submit', payload)
})

function save() {
  submit()
  nextTick(() => form.value?.querySelector('[aria-invalid="true"]')?.focus())
}

const fieldError = (name) => errors[name] || fieldErrors[name] || ''
</script>

<template>
  <BaseModal
    :title="link ? 'Editar link de apoio' : 'Novo link de apoio'"
    size="sm"
    @close="!saving && emit('close')"
  >
    <form
      :id="formId"
      ref="form"
      class="link-form"
      novalidate
      :aria-busy="saving"
      @submit.prevent="save"
    >
      <p v-if="fieldErrors.detail" class="link-form__alert" role="alert">
        {{ fieldErrors.detail }}
      </p>
      <BaseInput
        v-model="values.title"
        label="Título"
        name="title"
        placeholder="Ex.: Protótipo no Figma"
        required
        autofocus
        :maxlength="TITLE_MAX"
        :disabled="saving"
        :error="fieldError('title')"
        @blur="values.title && validateField('title')"
      />
      <BaseInput
        v-model="values.url"
        label="Endereço (URL)"
        name="url"
        type="url"
        inputmode="url"
        placeholder="https://"
        required
        :maxlength="URL_MAX"
        :disabled="saving"
        :error="fieldError('url')"
        @blur="values.url && validateField('url')"
      />
      <div v-if="tasks" class="link-form__field">
        <BaseSelect
          v-model="values.task"
          label="Tarefa vinculada"
          :options="taskOptions"
          :disabled="saving"
          :invalid="Boolean(fieldErrors.task)"
        />
        <small v-if="fieldErrors.task" class="link-form__error" role="alert">
          {{ fieldErrors.task }}
        </small>
      </div>
    </form>

    <template #footer>
      <BaseButton variant="ghost" :disabled="saving" @click="emit('close')">Cancelar</BaseButton>
      <BaseButton type="submit" :form="formId" :loading="saving">
        {{ link ? 'Salvar alterações' : 'Adicionar link' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.link-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.link-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.link-form__error {
  color: var(--color-danger);
  font-size: var(--font-size-xs);
}
.link-form__alert {
  padding: var(--space-2) var(--space-3);
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  border-radius: var(--radius-md);
  background: var(--color-danger-soft);
}
</style>
