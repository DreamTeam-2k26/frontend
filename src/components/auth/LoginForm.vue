<script setup>
import { LockKeyhole, Mail } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useForm } from '@/composables/useForm'
import { email, required } from '@/utils/validators'

const { loading = false } = defineProps({
  loading: { type: Boolean, default: false },
})

const emit = defineEmits({
  submit: (payload) => Boolean(payload?.email && payload?.password),
})

const { values, errors, validateField, handleSubmit } = useForm(
  { email: '', password: '' },
  {
    email: [required(), email()],
    password: [required()],
  },
)

const onSubmit = handleSubmit((payload) => emit('submit', payload))
</script>

<template>
  <form class="auth-form" novalidate :aria-busy="loading" @submit.prevent="!loading && onSubmit()">
    <BaseInput
      v-model="values.email"
      label="E-mail"
      :icon="Mail"
      name="email"
      type="email"
      autocomplete="email"
      placeholder="voce@exemplo.com"
      required
      :disabled="loading"
      :error="errors.email"
      @blur="validateField('email')"
    />
    <BaseInput
      v-model="values.password"
      label="Senha"
      :icon="LockKeyhole"
      name="password"
      type="password"
      autocomplete="current-password"
      placeholder="Digite sua senha"
      required
      :disabled="loading"
      :error="errors.password"
      @blur="validateField('password')"
    />
    <BaseButton type="submit" block :loading="loading">Entrar</BaseButton>
  </form>
</template>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
