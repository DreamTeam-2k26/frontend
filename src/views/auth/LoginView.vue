<script setup>
import { RouterLink, useRoute } from 'vue-router'
import AuthCard from '@/components/auth/AuthCard.vue'
import GoogleSignIn from '@/components/auth/GoogleSignIn.vue'
import LoginForm from '@/components/auth/LoginForm.vue'
import { authQuery } from '@/utils/authRedirect'
import { useAuthEntry } from '@/composables/useAuthEntry'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const enterApp = useAuthEntry()

async function onSubmit(credentials) {
  try {
    if ((await authStore.login(credentials)) === false) return
    // Só depois da resposta positiva da API.
    enterApp()
  } catch {
    // Store já mostra toast de erro.
  }
}
</script>

<template>
  <AuthCard title="Bem-vindo ao Fluxo" subtitle="Entre na sua conta para continuar de onde parou.">
    <div class="auth-actions">
      <LoginForm :loading="authStore.loading" @submit="onSubmit" />
      <GoogleSignIn :disabled="authStore.loading" @success="enterApp" />
    </div>

    <template #footer>
      Ainda não tem uma conta?
      <RouterLink
        :to="{ name: 'register', query: authQuery(route.query.redirect) }"
        class="auth-link"
        >Criar conta</RouterLink
      >
    </template>
  </AuthCard>
</template>

<style scoped>
.auth-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

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
