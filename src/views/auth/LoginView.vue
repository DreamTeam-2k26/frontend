<script setup>
import { RouterLink, useRouter } from "vue-router";
import AuthCard from "@/components/auth/AuthCard.vue";
import LoginForm from "@/components/auth/LoginForm.vue";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const router = useRouter();

async function onSubmit(credentials) {
  try {
    await authStore.login(credentials);

    const redirect = router.currentRoute.value.query.redirect;

    const destination =
      typeof redirect === "string" &&
      redirect.startsWith("/") &&
      !redirect.startsWith("//")
        ? redirect
        : { name: "home" };

    await router.push(destination);
  } catch {
    // Store já mostra toast de erro.
  }
}
</script>


<template>
  <AuthCard title="Entrar" subtitle="Acesse sua conta para continuar.">
    <LoginForm :loading="authStore.loading" @submit="onSubmit" />

    <template #footer>
      Não tem conta?
      <RouterLink :to="{ name: 'register' }" class="auth-link">Cadastre-se</RouterLink>
    </template>
  </AuthCard>
</template>

<style scoped>
.auth-link {
  color: var(--color-primary);
  font-weight: 500;
}
</style>
