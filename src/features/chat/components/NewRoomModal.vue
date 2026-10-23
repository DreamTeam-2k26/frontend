<script setup>
import { ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import ChatModal from './ChatModal.vue'
import UserPicker from './UserPicker.vue'

const { saving = false } = defineProps({ saving: { type: Boolean, default: false } })
const emit = defineEmits(['close', 'create'])

const name = ref('')
const members = ref([])
const image = ref(null)
const error = ref('')

function onImage(event) {
  image.value = event.target.files[0] ?? null
}

function submit() {
  const trimmed = name.value.trim()

  if (!trimmed) {
    error.value = 'Dê um nome à sala.'

    return
  }

  error.value = ''
  emit('create', {
    name: trimmed,
    members: members.value.map((user) => user.id),
    image: image.value,
  })
}
</script>

<template>
  <ChatModal title="Nova sala" @close="emit('close')">
    <form id="new-room-form" class="form" novalidate @submit.prevent="submit">
      <BaseInput
        v-model="name"
        label="Nome da sala"
        maxlength="80"
        :error="error"
        autocomplete="off"
      />

      <div class="form__image">
        <label for="new-room-image">Imagem da sala (opcional)</label>
        <input id="new-room-image" type="file" accept="image/jpeg,image/png" @change="onImage" />
      </div>

      <UserPicker v-model="members" />
      <p class="form__hint">
        Você será o administrador da sala. É possível convidar mais gente depois.
      </p>
    </form>

    <template #footer>
      <BaseButton variant="secondary" @click="emit('close')">Cancelar</BaseButton>
      <BaseButton type="submit" form="new-room-form" :loading="saving">Criar sala</BaseButton>
    </template>
  </ChatModal>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form__image {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  font-size: 0.875rem;
}

.form__image label {
  font-weight: 500;
}

.form__image input {
  padding: 0.5rem;
}

.form__hint {
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
}
</style>
