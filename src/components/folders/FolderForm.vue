<script setup>
import { nextTick, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useForm } from '@/composables/useForm'
import { required } from '@/utils/validators'
import FolderDialog from './FolderDialog.vue'
import { folderNameError } from './folderState'
const props = defineProps({
  folder: { type: Object, default: null },
  siblings: { type: Array, required: true },
  busy: Boolean,
  error: { type: String, default: '' },
})
const emit = defineEmits(['save', 'close'])
const form = ref(null)
const { values, errors, validateField, handleSubmit } = useForm(
  { name: props.folder?.name ?? '' },
  {
    name: [
      required('Informe o nome da pasta.'),
      (name) => folderNameError(name, props.siblings, props.folder?.id),
    ],
  },
)
const submit = handleSubmit(({ name }) => {
  if (!props.busy) emit('save', name.trim())
})
function save() {
  submit()
  nextTick(() => form.value.querySelector('[aria-invalid="true"]')?.focus())
}
</script>

<template>
  <FolderDialog
    :title="folder ? 'Renomear pasta' : 'Nova pasta'"
    :busy="busy"
    @close="emit('close')"
  >
    <form ref="form" novalidate @submit.prevent="save">
      <p v-if="error" class="operation-error" role="alert">{{ error }}</p>
      <BaseInput
        v-model="values.name"
        label="Nome da pasta"
        name="name"
        required
        maxlength="100"
        autofocus
        :disabled="busy"
        :error="errors.name"
        @blur="validateField('name')"
      />
      <div class="dialog-actions">
        <BaseButton variant="secondary" :disabled="busy" @click="emit('close')"
          >Cancelar</BaseButton
        >
        <BaseButton type="submit" :loading="busy">{{
          busy ? 'Salvando…' : 'Salvar pasta'
        }}</BaseButton>
      </div>
    </form>
  </FolderDialog>
</template>
