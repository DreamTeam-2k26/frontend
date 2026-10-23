<script setup>
import { nextTick, onMounted, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import UserPicker from '@/components/projects/UserPicker.vue'
import { useForm } from '@/composables/useForm'
import { required } from '@/utils/validators'

const props = defineProps({
  project: { type: Object, default: null },
  saving: Boolean,
  error: { type: String, default: '' },
  fieldErrors: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['save', 'close'])
const dialog = ref(null)
const invitees = ref([])
const { values, errors, validateField, handleSubmit } = useForm(
  { name: props.project?.name ?? '', description: props.project?.description ?? '' },
  {
    name: [
      required('Informe o nome do projeto.'),
      (value) => (value.trim().length > 100 ? 'Use no máximo 100 caracteres.' : ''),
    ],
  },
)
const submit = handleSubmit((data) => {
  if (!props.saving)
    emit('save', {
      name: data.name.trim(),
      description: data.description.trim(),
      invitees: invitees.value,
    })
})
function save() {
  submit()
  nextTick(() => dialog.value?.querySelector('[aria-invalid="true"]')?.focus())
}
onMounted(() => dialog.value.showModal())
</script>

<template>
  <dialog
    ref="dialog"
    class="project-form"
    aria-labelledby="project-form-title"
    @cancel.prevent="!saving && emit('close')"
  >
    <form novalidate :aria-busy="saving" @submit.prevent="save">
      <h2 id="project-form-title">{{ project ? 'Editar projeto' : 'Novo projeto' }}</h2>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <BaseInput
        v-model="values.name"
        label="Nome do projeto"
        name="name"
        required
        maxlength="100"
        autofocus
        :disabled="saving"
        :error="errors.name || fieldErrors.name"
        @blur="validateField('name')"
      />
      <div class="description">
        <label for="project-description">Descrição (opcional)</label>
        <textarea
          id="project-description"
          v-model="values.description"
          name="description"
          rows="4"
          :disabled="saving"
          :aria-invalid="!!fieldErrors.description"
          :aria-describedby="fieldErrors.description ? 'description-error' : undefined"
        />
        <small v-if="fieldErrors.description" id="description-error" class="error">{{
          fieldErrors.description
        }}</small>
      </div>
      <div v-if="!project" class="invite">
        <UserPicker v-model="invitees" label="Convidar pessoas (opcional)" :disabled="saving" />
        <small>Quem você escolher recebe um convite e entra como Membro ao aceitar.</small>
      </div>
      <div class="actions">
        <BaseButton variant="secondary" :disabled="saving" @click="emit('close')"
          >Cancelar</BaseButton
        >
        <BaseButton type="submit" :loading="saving">{{
          saving ? 'Salvando…' : 'Salvar projeto'
        }}</BaseButton>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.project-form {
  margin: auto;
  width: min(32rem, calc(100% - 2rem));
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  color: var(--color-text);
  background: var(--color-bg-card);
}
.project-form::backdrop {
  background: color-mix(in srgb, var(--color-text) 45%, transparent);
}
form,
.description,
.invite {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.description,
.invite {
  gap: var(--space-2);
}
.invite small {
  color: var(--color-text-secondary);
}
label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
textarea {
  padding: var(--space-3);
  min-height: 7rem;
}
.error {
  color: var(--color-danger);
  overflow-wrap: anywhere;
}
.actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--space-3);
}
</style>
