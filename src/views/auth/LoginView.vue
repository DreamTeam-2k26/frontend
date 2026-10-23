<script setup>
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AuthCard from '@/components/auth/AuthCard.vue'
import GoogleSignIn from '@/components/auth/GoogleSignIn.vue'
import LoginForm from '@/components/auth/LoginForm.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

// Só aceita caminhos internos (começam com uma única barra) para evitar redirecionamento aberto.
function destination() {
  const redirect = route.query.redirect

  return typeof redirect === 'string' && /^\/(?![/\\])/.test(redirect) ? redirect : { name: 'home' }
}

async function onSubmit(credentials) {
  try {
    await authStore.login(credentials)
    router.push(destination())
  } catch {
    // Store já mostra toast de erro.
  }
}
</script>

<template>
  <AuthCard title="Bem-vindo ao Fluxo" subtitle="Entre na sua conta para continuar de onde parou.">
    <div class="auth-actions">
      <LoginForm :loading="authStore.loading" @submit="onSubmit" />
      <GoogleSignIn :disabled="authStore.loading" />
    </div>

    <template #footer>
      Ainda não tem uma conta?
      <RouterLink :to="{ name: 'register' }" class="auth-link">Criar conta</RouterLink>
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
