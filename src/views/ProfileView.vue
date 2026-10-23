<script setup>
import { computed, onMounted, shallowRef } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ProfileForm from '@/components/user/ProfileForm.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const status = shallowRef('loading') // loading | ready | error
const loadError = shallowRef('')

// Remonta o formulário com os dados salvos (zera foto pendente e alterações).
const formKey = computed(() =>
  [authStore.user?.name, authStore.user?.profile_picture?.url].join('|'),
)

async function load() {
  status.value = 'loading'
  loadError.value = ''

  try {
    await authStore.fetchUser({ force: true })
    status.value = 'ready'
  } catch (error) {
    loadError.value = error?.response?.data?.detail || 'Verifique sua conexão e tente de novo.'
    status.value = 'error'
  }
}

async function onSubmit(changes) {
  try {
    await authStore.updateProfile(changes)
  } catch {
    // Store já mostra toast de erro; o formulário mantém o que foi digitado.
  }
}

onMounted(load)
</script>

<template>
  <section class="profile-page">
    <header class="profile-page__header">
      <h1 class="profile-page__title">Perfil</h1>
      <p class="profile-page__subtitle">Como sua equipe vê você no Fluxo.</p>
    </header>

    <div v-if="status === 'loading'" class="profile-page__loading" aria-busy="true">
      <span class="sr-only">Carregando perfil...</span>
      <span class="skeleton skeleton--avatar" />
      <span class="skeleton skeleton--line" />
      <span class="skeleton skeleton--line skeleton--short" />
    </div>

    <div v-else-if="status === 'error'" class="profile-page__error" role="alert">
      <h2 class="profile-page__error-title">Não foi possível carregar seu perfil.</h2>
      <p class="profile-page__subtitle">{{ loadError }}</p>
      <BaseButton variant="secondary" @click="load">Tentar novamente</BaseButton>
    </div>

    <ProfileForm
      v-else
      :key="formKey"
      :user="authStore.user"
      :saving="authStore.saving"
      @submit="onSubmit"
    />
  </section>
</template>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  width: 100%;
  max-width: 44rem;
  padding: var(--space-8) var(--space-6);
}

.profile-page__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.profile-page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.02em;
}

.profile-page__subtitle {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.profile-page__loading,
.profile-page__error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-6);
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.profile-page__error-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
}

.skeleton {
  display: block;
  background-color: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
  animation: skeleton-pulse 1.2s ease-in-out infinite alternate;
}

.skeleton--avatar {
  width: 6rem;
  height: 6rem;
  border-radius: var(--radius-full);
}

.skeleton--line {
  width: 100%;
  height: calc(var(--space-10) + var(--space-1));
}

.skeleton--short {
  width: 60%;
}

@keyframes skeleton-pulse {
  to {
    opacity: 0.5;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
  }
}

@media (max-width: 767px) {
  .profile-page {
    padding: var(--space-6) var(--space-4);
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
