<script setup>
import { LockKeyhole, Mail, UserRound } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useForm } from '@/composables/useForm'
import { email, minLength, required, sameAs } from '@/utils/validators'

const { loading = false } = defineProps({
  loading: { type: Boolean, default: false },
})

const emit = defineEmits({
  submit: (payload) => Boolean(payload?.name && payload?.email && payload?.password),
})

const { values, errors, validateField, handleSubmit } = useForm(
  { name: '', email: '', password: '', passwordConfirm: '' },
  {
    name: [required()],
    email: [required(), email()],
    password: [required(), minLength(8)],
    passwordConfirm: [required(), sameAs('password', 'As senhas não conferem.')],
  },
)

// Confirmação fica só no front; API recebe apenas nome, email e senha.
const onSubmit = handleSubmit((payload) =>
  emit('submit', { name: payload.name.trim(), email: payload.email, password: payload.password }),
)
</script>

<template>
  <form class="auth-form" novalidate :aria-busy="loading" @submit.prevent="!loading && onSubmit()">
    <BaseInput
      v-model="values.name"
      label="Seu nome"
      :icon="UserRound"
      name="name"
      autocomplete="name"
      placeholder="Nome e sobrenome"
      maxlength="150"
      required
      :disabled="loading"
      :error="errors.name"
      @blur="validateField('name')"
    />
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
      autocomplete="new-password"
      placeholder="No mínimo 8 caracteres"
      required
      :disabled="loading"
      :error="errors.password"
      @blur="validateField('password')"
    />
    <BaseInput
      v-model="values.passwordConfirm"
      label="Confirmar senha"
      :icon="LockKeyhole"
      name="passwordConfirm"
      type="password"
      autocomplete="new-password"
      placeholder="Repita sua senha"
      required
      :disabled="loading"
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
  gap: var(--space-3);
}
</style>
