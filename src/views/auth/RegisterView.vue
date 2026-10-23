<script setup>
import { RouterLink, useRouter } from 'vue-router'
import AuthCard from '@/components/auth/AuthCard.vue'
import RegisterForm from '@/components/auth/RegisterForm.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

async function onSubmit(credentials) {
  try {
    await authStore.register(credentials)
    router.push({ name: 'home' })
  } catch {
    // Store já mostra toast de erro.
  }
}
</script>

<template>
  <AuthCard title="Criar conta" subtitle="Preencha os dados para começar.">
    <RegisterForm :loading="authStore.loading" @submit="onSubmit" />

    <template #footer>
      Já tem conta?
      <RouterLink :to="{ name: 'login' }" class="auth-link">Entrar</RouterLink>
    </template>
  </AuthCard>
</template>

<style scoped>
.auth-link {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
  text-decoration: underline;
  text-underline-offset: var(--space-1);
}

.auth-link:hover {
  color: var(--color-primary-hover);
}
</style>
