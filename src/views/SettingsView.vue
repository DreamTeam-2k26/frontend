<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { LogOut } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import BaseButton from '@/components/ui/BaseButton.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'

const authStore = useAuthStore()
const router = useRouter()
const leaving = ref(false)
async function logout() {
  if (leaving.value) return
  leaving.value = true
  try {
    await router.replace({ name: 'login' })
    authStore.logout()
  } finally {
    leaving.value = false
  }
}
</script>

<template>
  <section class="settings">
    <h1>Configurações pessoais</h1>
    <div class="card">
      <h2>Perfil</h2>
      <p>Consulte e atualize suas informações pessoais.</p>
      <BaseButton variant="secondary" :to="{ name: 'profile' }">Abrir Perfil</BaseButton>
    </div>
    <div class="card">
      <h2>Aparência</h2>
      <p>Escolha entre o tema claro e o escuro.</p>
      <ThemeToggle />
    </div>
    <div class="card">
      <h2>Sessão</h2>
      <p>Encerre sua sessão neste dispositivo.</p>
      <BaseButton variant="secondary" :loading="leaving" @click="logout">
        <LogOut :size="16" aria-hidden="true" /> Sair da conta
      </BaseButton>
    </div>
  </section>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: 100%;
  max-width: 44rem;
  margin: 0 auto;
  padding: var(--space-8) var(--space-6);
}
.card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
p {
  color: var(--color-text-secondary);
}
@media (max-width: 700px) {
  .settings {
    padding: var(--space-5) var(--space-4);
  }
}
</style>
