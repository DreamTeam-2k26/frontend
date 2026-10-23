<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { listReceivedInvites, acceptInvite, declineInvite } from '@/api/invites'
import {
  inviteStatus,
  statuses,
  roles,
  formatDate,
  teamError,
} from '@/components/members/teamState'
import { useAuthStore } from '@/stores/auth'
import { useConnection } from '@/composables/useConnection'
const emit = defineEmits(['accepted'])
const auth = useAuthStore()
const invites = ref([]),
  loading = ref(true),
  busy = ref(null),
  error = ref(''),
  feedback = ref(''),
  acceptedProject = ref(null),
  now = ref(Date.now())
const { offline } = useConnection(load)
let generation = 0,
  controller
const timer = setInterval(() => (now.value = Date.now()), 1000)
async function load() {
  const current = ++generation
  controller?.abort()
  controller = new AbortController()
  invites.value = []
  error.value = ''
  loading.value = true
  if (offline.value) {
    loading.value = false
    return
  }
  try {
    await auth.fetchUser()
    if (current !== generation) return
    const data = await listReceivedInvites({ signal: controller.signal })
    if (current === generation) invites.value = data
  } catch (cause) {
    if (current === generation) error.value = teamError(cause)
  } finally {
    if (current === generation) loading.value = false
  }
}
watch(
  () => auth.user?.id,
  (id, previous) => {
    if (id === previous) return
    acceptedProject.value = null
    feedback.value = ''
    busy.value = null
    if (id) load()
    else {
      generation++
      controller?.abort()
      invites.value = []
    }
  },
)
onMounted(load)
onBeforeUnmount(() => {
  generation++
  controller?.abort()
  clearInterval(timer)
})
async function respond(invite, accept) {
  if (busy.value !== null || offline.value || inviteStatus(invite) !== 'pending') return
  const account = auth.user?.id
  busy.value = invite.id
  feedback.value = ''
  error.value = ''
  try {
    const result = await (accept ? acceptInvite(invite.id) : declineInvite(invite.id))
    if (account !== auth.user?.id) return
    invites.value = invites.value.filter((item) => item.id !== invite.id)
    feedback.value = accept ? 'Convite aceito. Você já participa do projeto.' : 'Convite recusado.'
    if (accept) {
      acceptedProject.value = result.project
      window.dispatchEvent(new Event('projects:changed'))
      emit('accepted', result.project)
    }
    await load()
  } catch (cause) {
    if (account === auth.user?.id) {
      feedback.value = teamError(cause)
      await load()
    }
  } finally {
    if (account === auth.user?.id) busy.value = null
  }
}
</script>
<template>
  <section class="received-invites" aria-labelledby="received-title">
    <header>
      <h2 id="received-title">Convites recebidos</h2>
      <span v-if="!loading && !error"
        >{{
          invites.filter((item) => inviteStatus(item, now) === 'pending').length
        }}
        pendentes</span
      >
    </header>
    <p v-if="offline" role="status">
      Você está offline. Reconecte-se para consultar e responder aos convites.
    </p>
    <p v-if="loading" role="status" aria-busy="true">Carregando convites…</p>
    <div v-else-if="error" role="alert">
      <p>{{ error }}</p>
      <BaseButton variant="secondary" :disabled="offline" @click="load"
        >Tentar novamente</BaseButton
      >
    </div>
    <p v-else-if="!invites.length && !offline">
      Nenhum convite pendente. Os convites para sua conta aparecerão aqui.
    </p>
    <p v-if="feedback" role="status">{{ feedback }}</p>
    <BaseButton
      v-if="acceptedProject"
      variant="secondary"
      :to="{ name: 'project-detail', params: { id: acceptedProject } }"
      >Abrir projeto aceito</BaseButton
    >
    <ul v-if="!loading">
      <li v-for="invite in invites" :key="invite.id">
        <div>
          <h3>{{ invite.project_name }}</h3>
          <p>
            {{ invite.invited_by_name || 'Uma pessoa da equipe' }} convidou você como
            {{ roles[invite.role] }}.
          </p>
          <p>
            {{
              invite.expires_at
                ? `Validade: ${formatDate(invite.expires_at)}`
                : 'Sem expiração informada'
            }}
          </p>
        </div>
        <div v-if="inviteStatus(invite, now) === 'pending'" class="actions">
          <BaseButton
            variant="secondary"
            :disabled="busy !== null || offline"
            @click="respond(invite, false)"
            >Recusar</BaseButton
          ><BaseButton
            :loading="busy === invite.id"
            :disabled="busy !== null || offline"
            @click="respond(invite, true)"
            >Aceitar</BaseButton
          >
        </div>
        <p v-else>{{ statuses[inviteStatus(invite, now)] }}</p>
      </li>
    </ul>
  </section>
</template>
<style scoped>
.received-invites {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  width: 100%;
}
header,
li,
.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
h2 {
  font-size: var(--font-size-md);
}
h3 {
  font-size: var(--font-size-sm);
}
p,
header span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  overflow-wrap: anywhere;
}
li {
  padding-block: var(--space-3);
  border-top: 1px solid var(--color-border);
}
li p {
  margin-top: var(--space-1);
}
.actions {
  flex-shrink: 0;
}
@media (max-width: 700px) {
  li {
    flex-direction: column;
    align-items: start;
  }
  .actions {
    flex-wrap: wrap;
  }
}
</style>
