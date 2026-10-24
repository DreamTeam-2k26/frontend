<script setup>
import { computed, onBeforeUnmount, shallowRef, useTemplateRef } from 'vue'
import { CircleCheck, ImageUp, Mail, Trash2, UserRound, Crop } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import PhotoCropper from '@/components/user/PhotoCropper.vue'
import { useForm } from '@/composables/useForm'
import { required } from '@/utils/validators'

// Mesmos formatos aceitos pelo uploader do backend.
const ACCEPTED_TYPES = ['image/png', 'image/jpeg']

const {
  user,
  saving = false,
  justSaved = false,
} = defineProps({
  // Resposta de GET /users/me/: { id, email, name, profile_picture }
  user: { type: Object, required: true },
  saving: { type: Boolean, default: false },
  // Salvamento confirmado pela API há pouco: mostra a confirmação breve no rodapé.
  justSaved: { type: Boolean, default: false },
})

const emit = defineEmits({
  submit: (payload) => typeof payload?.name === 'string',
})

const { values, errors, validateField, handleSubmit } = useForm(
  { name: user.name ?? '' },
  { name: [required('Informe seu nome.')] },
)

const fileInput = useTemplateRef('fileInput')
const photo = shallowRef(null)
const photoPreview = shallowRef('')
const removePhoto = shallowRef(false)
const photoError = shallowRef('')
const cropSource = shallowRef(null)
const cropInitial = shallowRef(null)
const originalPhoto = shallowRef(null)
const appliedCrop = shallowRef(null)

const currentPicture = computed(() => user.profile_picture?.url ?? '')
const avatarSrc = computed(() => {
  if (photoPreview.value) return photoPreview.value
  return removePhoto.value ? '' : currentPicture.value
})
const hasPicture = computed(() => Boolean(avatarSrc.value))
const nameChanged = computed(() => values.name.trim() !== (user.name ?? ''))
const dirty = computed(() => nameChanged.value || Boolean(photo.value) || removePhoto.value)
const saved = computed(() => justSaved && !saving && !dirty.value)
const status = computed(() => {
  if (saving) return 'Salvando alterações...'
  if (saved.value) return 'Alterações salvas.'
  return dirty.value ? 'Você tem alterações não salvas.' : 'Nenhuma alteração para salvar.'
})

function setPreview(file) {
  if (photoPreview.value) URL.revokeObjectURL(photoPreview.value)
  photoPreview.value = file ? URL.createObjectURL(file) : ''
}

function chooseFile() {
  fileInput.value?.click()
}

function onFileChange(event) {
  const [file] = event.target.files ?? []
  event.target.value = ''
  if (!file) return

  if (!ACCEPTED_TYPES.includes(file.type)) {
    photoError.value = 'Escolha uma imagem PNG ou JPG.'
    return
  }

  photoError.value = ''
  cropInitial.value = null
  cropSource.value = file
}

function applyCrop({ file, crop }) {
  originalPhoto.value = cropSource.value
  appliedCrop.value = crop
  photo.value = file
  removePhoto.value = false
  setPreview(file)
  cropSource.value = null
}
function editCrop() {
  cropInitial.value = appliedCrop.value
  cropSource.value = originalPhoto.value
}

function onRemovePhoto() {
  photoError.value = ''
  photo.value = null
  originalPhoto.value = null
  appliedCrop.value = null
  cropSource.value = null
  setPreview(null)
  removePhoto.value = Boolean(currentPicture.value)
}

function discard() {
  values.name = user.name ?? ''
  errors.name = ''
  photoError.value = ''
  photo.value = null
  originalPhoto.value = null
  appliedCrop.value = null
  cropSource.value = null
  removePhoto.value = false
  setPreview(null)
}

const onSubmit = handleSubmit(() => {
  if (!dirty.value) return

  emit('submit', {
    name: values.name.trim(),
    photo: photo.value,
    removePhoto: removePhoto.value,
  })
})

onBeforeUnmount(() => setPreview(null))
</script>

<template>
  <form class="profile-form" novalidate :aria-busy="saving" @submit.prevent="!saving && onSubmit()">
    <section
      class="profile-form__section profile-form__photo"
      aria-labelledby="profile-photo-title"
    >
      <UserAvatar :name="values.name || user.name" :src="avatarSrc" size="lg" />

      <div class="profile-form__photo-body">
        <h2 id="profile-photo-title" class="profile-form__heading">Foto do perfil</h2>
        <p class="profile-form__hint">Aparece para quem participa dos seus projetos. PNG ou JPG.</p>

        <div class="profile-form__photo-actions">
          <BaseButton variant="secondary" :disabled="saving" @click="chooseFile">
            <ImageUp :size="16" aria-hidden="true" />
            {{ hasPicture ? 'Trocar foto' : 'Enviar foto' }}
          </BaseButton>
          <BaseButton v-if="originalPhoto" variant="secondary" :disabled="saving" @click="editCrop">
            <Crop :size="16" aria-hidden="true" /> Ajustar foto
          </BaseButton>
          <BaseButton v-if="hasPicture" variant="ghost" :disabled="saving" @click="onRemovePhoto">
            <Trash2 :size="16" aria-hidden="true" />
            Remover foto
          </BaseButton>
        </div>

        <input
          ref="fileInput"
          type="file"
          class="sr-only"
          tabindex="-1"
          aria-hidden="true"
          accept="image/png,image/jpeg"
          @change="onFileChange"
        />
        <p v-if="photoError" class="profile-form__error" role="alert">{{ photoError }}</p>
        <p v-else-if="photo" class="profile-form__note">
          Nova foto selecionada. Salve para aplicar.
        </p>
        <p v-else-if="removePhoto" class="profile-form__note">
          A foto será removida quando você salvar.
        </p>
      </div>
    </section>

    <section class="profile-form__section profile-form__fields" aria-label="Dados da conta">
      <BaseInput
        v-model="values.name"
        label="Nome"
        :icon="UserRound"
        name="name"
        autocomplete="name"
        maxlength="150"
        required
        :disabled="saving"
        :error="errors.name"
        @blur="validateField('name')"
      />
      <div class="profile-form__readonly">
        <BaseInput
          :model-value="user.email"
          label="E-mail"
          :icon="Mail"
          name="email"
          type="email"
          readonly
          aria-describedby="profile-email-hint"
        />
        <small id="profile-email-hint" class="profile-form__hint">
          O e-mail é usado para entrar e não pode ser alterado aqui.
        </small>
      </div>
    </section>

    <footer class="profile-form__footer">
      <p
        class="profile-form__status"
        :class="{ 'profile-form__status--saved': saved }"
        aria-live="polite"
      >
        <CircleCheck v-if="saved" class="profile-form__saved-icon" :size="16" aria-hidden="true" />
        {{ status }}
      </p>
      <div class="profile-form__buttons">
        <BaseButton variant="ghost" :disabled="!dirty || saving" @click="discard">
          Descartar
        </BaseButton>
        <BaseButton type="submit" :loading="saving" :disabled="!dirty"
          >Salvar alterações</BaseButton
        >
      </div>
    </footer>
  </form>
  <PhotoCropper
    v-if="cropSource"
    :file="cropSource"
    :initial="cropInitial"
    @apply="applyCrop"
    @close="cropSource = null"
  />
</template>

<style scoped>
.profile-form {
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.profile-form__section {
  padding: var(--space-6);
}

.profile-form__section + .profile-form__section {
  border-top: 1px solid var(--color-border);
}

.profile-form__photo {
  display: flex;
  align-items: flex-start;
  gap: var(--space-5);
}

.profile-form__photo-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.profile-form__heading {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
}

.profile-form__hint {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
}

.profile-form__photo-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.profile-form__note {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.profile-form__error {
  color: var(--color-danger);
  font-size: var(--font-size-xs);
}

.profile-form__fields {
  display: grid;
  gap: var(--space-5);
}

.profile-form__readonly {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.profile-form__readonly .profile-form__hint {
  font-size: var(--font-size-xs);
}

.profile-form__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  background-color: var(--color-bg-subtle);
  border-top: 1px solid var(--color-border);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.profile-form__status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.profile-form__status--saved {
  color: var(--color-success);
  animation: profile-saved-in var(--motion-slow) var(--ease-flow) both;
}

.profile-form__saved-icon {
  animation: profile-saved-check var(--motion-slow) var(--ease-flow) both;
}

@keyframes profile-saved-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
}

@keyframes profile-saved-check {
  from {
    transform: scale(0.4);
  }
}

.profile-form__buttons {
  display: flex;
  gap: var(--space-2);
}

@media (max-width: 599px) {
  .profile-form__section {
    padding: var(--space-5);
  }

  .profile-form__photo {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .profile-form__photo-actions {
    justify-content: center;
  }

  .profile-form__footer {
    flex-direction: column-reverse;
    align-items: stretch;
    padding: var(--space-4) var(--space-5);
    text-align: center;
  }

  .profile-form__buttons > * {
    flex: 1;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
