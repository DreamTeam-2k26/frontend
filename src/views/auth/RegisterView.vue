<script setup>
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AuthCard from '@/components/auth/AuthCard.vue'
import GoogleSignIn from '@/components/auth/GoogleSignIn.vue'
import RegisterForm from '@/components/auth/RegisterForm.vue'
import { authDestination, authQuery } from '@/utils/authRedirect'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

async function onSubmit(credentials) {
  try {
    if ((await authStore.register(credentials)) === false) return
    router.push(authDestination(route.query.redirect))
  } catch {
    // Store já mostra toast de erro.
  }
}
</script>

<template>
  <AuthCard title="Crie sua conta" subtitle="Comece a organizar seus projetos com sua equipe.">
    <div class="auth-actions">
      <RegisterForm :loading="authStore.loading" @submit="onSubmit" />
      <GoogleSignIn
        :disabled="authStore.loading"
        @success="router.push(authDestination(route.query.redirect))"
      />
    </div>

    <template #footer>
      Já possui conta?
      <RouterLink :to="{ name: 'login', query: authQuery(route.query.redirect) }" class="auth-link"
        >Entrar</RouterLink
      >
    </template>
  </AuthCard>
</template>

<style scoped>
.auth-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
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
