<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import { redeemInvite } from '@/api/invites'
import { getAccessToken, getRefreshToken } from '@/utils/token'
import { teamError } from '@/components/members/teamState'
import { useConnection } from '@/composables/useConnection'
const route = useRoute(),
  router = useRouter()
const busy = ref(false),
  error = ref(''),
  joined = ref(null)
const { offline } = useConnection()
const valid = computed(() => /^[A-Za-z0-9_-]{1,64}$/.test(String(route.params.token || '')))
const signedIn = computed(() => !!getAccessToken() || !!getRefreshToken())
const returnTo = computed(() => ({ redirect: route.fullPath }))
let generation = 0
watch(
  () => route.params.token,
  () => {
    generation++
    error.value = ''
    joined.value = null
    busy.value = false
  },
)
onBeforeUnmount(() => generation++)
async function redeem() {
  if (busy.value || offline.value || !valid.value) return
  if (!getAccessToken() && !getRefreshToken()) {
    router.push({ name: 'login', query: returnTo.value })
    return
  }
  const current = generation
  busy.value = true
  error.value = ''
  try {
    const membership = await redeemInvite(route.params.token)
    if (current !== generation) return
    joined.value = membership.project
    window.dispatchEvent(new Event('projects:changed'))
    await router.replace({ name: 'project-detail', params: { id: membership.project } })
  } catch (cause) {
    if (current === generation) error.value = teamError(cause)
  } finally {
    if (current === generation) busy.value = false
  }
}
</script>
<template>
  <main class="redeem-page">
    <section class="redeem-card" aria-labelledby="redeem-title">
      <h1 id="redeem-title">Convite para um projeto do Fluxo</h1>
      <p v-if="!valid" role="alert">Este link de convite é inválido. Peça um novo link à equipe.</p>
      <template v-else
        ><p>
          Confirme para solicitar sua entrada no projeto. O servidor verificará o convite e o papel
          concedido ao resgatar.
        </p>
        <p>O link pode continuar disponível para outras pessoas enquanto estiver válido.</p>
        <p v-if="offline" role="status">Você está offline. Reconecte-se para continuar.</p>
        <p v-if="error" role="alert" class="error">{{ error }}</p>
        <BaseButton :loading="busy" :disabled="offline || !!joined" @click="redeem"
          >Entrar no projeto</BaseButton
        >
        <div v-if="!signedIn" class="auth-links">
          <p>Entre ou crie uma conta. Depois, você voltará a este convite para confirmar.</p>
          <BaseButton variant="secondary" :to="{ name: 'login', query: returnTo }"
            >Entrar na conta</BaseButton
          ><BaseButton variant="secondary" :to="{ name: 'register', query: returnTo }"
            >Criar conta</BaseButton
          >
        </div></template
      ><BaseButton variant="ghost" :to="{ name: 'projects' }">Ir para Meus Projetos</BaseButton>
    </section>
  </main>
</template>
<style scoped>
.redeem-page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: var(--space-5);
  background: var(--color-background);
}
.redeem-card {
  width: min(100%, 32rem);
  display: grid;
  gap: var(--space-5);
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
}
h1 {
  font-size: var(--font-size-xl);
}
p {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.error {
  color: var(--color-danger);
}
.auth-links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
</style>
