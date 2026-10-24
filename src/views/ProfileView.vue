<script setup>
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { LogOut } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import GoogleSignIn from '@/components/auth/GoogleSignIn.vue'
import { getGoogleLink } from '@/api/auth'
import { googleAuthError } from '@/utils/googleAuthError'
import ProfileForm from '@/components/user/ProfileForm.vue'
import { useAuthStore } from '@/stores/auth'
import { useAppTransition } from '@/composables/useAppTransition'

const authStore = useAuthStore()
const router = useRouter()
const transition = useAppTransition()
const leaving = shallowRef(false)
const status = shallowRef('loading') // loading | ready | error
const loadError = shallowRef('')
const googleLinked = shallowRef(null)
const googleLinkError = shallowRef('')
const checkingGoogle = shallowRef(false)
async function loadGoogleLink() {
  checkingGoogle.value = true
  googleLinkError.value = ''
  try {
    const { data } = await getGoogleLink()
    googleLinked.value = data.linked
  } catch (error) {
    googleLinkError.value = googleAuthError(error, true)
  } finally {
    checkingGoogle.value = false
  }
}
function onGoogleLinked(result) {
  googleLinked.value = result.linked === true
}

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

// Confirmação breve no formulário depois que a API aceita o salvamento.
const justSaved = shallowRef(false)
let savedTimer
async function onSubmit(changes) {
  try {
    await authStore.updateProfile(changes)
    justSaved.value = true
    clearTimeout(savedTimer)
    savedTimer = setTimeout(() => (justSaved.value = false), 2500)
  } catch {
    // Store já mostra toast de erro; o formulário mantém o que foi digitado.
  }
}

// O layout logado é desmontado ao ir para o login, o que também desliga o chat e os avisos de chamada.
async function onLogout() {
  if (leaving.value) return
  // Desmonta o formulário (depende de user.name) antes de qualquer limpeza e bloqueia novos cliques.
  leaving.value = true
  try {
    // A marca cobre a troca; a sessão é encerrada assim que o login monta, sem esperar a revelação.
    await transition.cover(async () => {
      try {
        // Primeiro sai da página: limpar o usuário antes faria o perfil renderizar sem dados.
        await router.replace({ name: 'login' })
      } finally {
        authStore.logout()
      }
    })
  } catch {
    // Navegação falhou: a sessão já foi encerrada; o guard leva ao login no próximo acesso.
  }
}

onBeforeUnmount(() => clearTimeout(savedTimer))

onMounted(() => {
  load()
  loadGoogleLink()
})
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
      v-else-if="!leaving"
      :key="formKey"
      :user="authStore.user"
      :saving="authStore.saving"
      :just-saved="justSaved"
      @submit="onSubmit"
    />

    <section v-if="status === 'ready'" class="profile-page__google" aria-labelledby="google-title">
      <h2 id="google-title" class="profile-page__error-title">Vincular Conta Google</h2>
      <p v-if="checkingGoogle" role="status">Conferindo vínculo…</p>
      <template v-else-if="googleLinkError">
        <p role="alert">{{ googleLinkError }}</p>
        <BaseButton variant="secondary" @click="loadGoogleLink">Tentar novamente</BaseButton>
      </template>
      <p v-else-if="googleLinked" role="status">Conta Google vinculada</p>
      <template v-else-if="googleLinked === false">
        <p class="profile-page__subtitle">Vincule sua conta para também entrar com Google.</p>
        <GoogleSignIn mode="link" :disabled="authStore.saving" @success="onGoogleLinked" />
      </template>
    </section>

    <section class="profile-page__session" aria-labelledby="session-title">
      <div>
        <h2 id="session-title" class="profile-page__error-title">Sessão</h2>
        <p class="profile-page__subtitle">Sai da sua conta neste navegador.</p>
      </div>
      <BaseButton variant="secondary" :disabled="leaving" @click="onLogout">
        <LogOut :size="16" aria-hidden="true" /> Sair da conta
      </BaseButton>
    </section>
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

.profile-page__google {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-6);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.profile-page__session {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-6);
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
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
