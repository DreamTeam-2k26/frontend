<script setup>
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useForm } from '@/composables/useForm'
import { email, minLength, required, sameAs } from '@/utils/validators'

const { loading = false } = defineProps({
  loading: { type: Boolean, default: false },
})

const emit = defineEmits({
  submit: (payload) => Boolean(payload?.email && payload?.password),
})

const { values, errors, validateField, handleSubmit } = useForm(
  { email: '', password: '', passwordConfirm: '' },
  {
    email: [required(), email()],
    password: [required(), minLength(8)],
    passwordConfirm: [required(), sameAs('password', 'As senhas não conferem.')],
  },
)

// Confirmação fica só no front; API recebe email e senha.
const onSubmit = handleSubmit((payload) =>
  emit('submit', { email: payload.email, password: payload.password }),
)
</script>

<template>
  <form class="auth-form" novalidate @submit.prevent="onSubmit">
    <BaseInput
      v-model="values.email"
      label="E-mail"
      type="email"
      autocomplete="email"
      placeholder="voce@exemplo.com"
      :error="errors.email"
      @blur="validateField('email')"
    />
    <BaseInput
      v-model="values.password"
      label="Senha"
      type="password"
      autocomplete="new-password"
      :error="errors.password"
      @blur="validateField('password')"
    />
    <BaseInput
      v-model="values.passwordConfirm"
      label="Confirmar senha"
      type="password"
      autocomplete="new-password"
      :error="errors.passwordConfirm"
      @blur="validateField('passwordConfirm')"
    />
    <BaseButton type="submit" block :loading="loading">Criar conta</BaseButton>
  </form>
</template>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
