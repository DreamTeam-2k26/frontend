<script setup>
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
      autocomplete="current-password"
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
  gap: 1rem;
}
</style>
