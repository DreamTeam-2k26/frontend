<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, Mail, X } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import { acceptInvite, declineInvite, listReceivedInvites } from '@/api/projectMembers'
import { apiMessage, roleLabel } from '@/components/projects/memberRules'

const emit = defineEmits(['accepted'])

const invites = ref([])
const busyId = ref(null)
const error = ref('')
let active = true

async function load() {
  try {
    const data = await listReceivedInvites()
    if (active) invites.value = Array.isArray(data) ? data : (data.results ?? [])
  } catch {
    // Os convites são opcionais nesta tela: se falhar, a lista de projetos continua funcionando.
  }
}

async function answer(invite, accept) {
  if (busyId.value) return
  busyId.value = invite.id
  error.value = ''

  try {
    if (accept) await acceptInvite(invite.id)
    else await declineInvite(invite.id)

    if (!active) return
    invites.value = invites.value.filter((item) => item.id !== invite.id)
    if (accept) emit('accepted', invite)
  } catch (cause) {
    if (!active) return
    error.value = apiMessage(cause, 'Não foi possível responder ao convite.')
    await load()
  } finally {
    busyId.value = null
  }
}

onMounted(load)
onBeforeUnmount(() => {
  active = false
})

defineExpose({ reload: load })
</script>

<template>
  <section v-if="invites.length" class="invites" aria-labelledby="invites-title">
    <h2 id="invites-title"><Mail :size="18" aria-hidden="true" /> Convites recebidos</h2>
    <p v-if="error" class="invites__error" role="alert">{{ error }}</p>
    <ul>
      <li v-for="invite in invites" :key="invite.id">
        <div class="invites__text">
          <strong>{{ invite.project_name }}</strong>
          <span>
            {{
              invite.invited_by_name
                ? `${invite.invited_by_name} convidou você`
                : 'Você foi convidado'
            }}
            como {{ roleLabel(invite.role).toLowerCase() }}.
          </span>
        </div>
        <div class="invites__actions">
          <BaseButton
            variant="secondary"
            :disabled="busyId === invite.id"
            :aria-label="`Recusar convite para ${invite.project_name}`"
            @click="answer(invite, false)"
            ><X :size="16" aria-hidden="true" /> Recusar</BaseButton
          >
          <BaseButton
            :loading="busyId === invite.id"
            :aria-label="`Aceitar convite para ${invite.project_name}`"
            @click="answer(invite, true)"
            ><Check :size="16" aria-hidden="true" /> Aceitar</BaseButton
          >
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.invites {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
}
h2 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-md);
}
ul {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}
.invites__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-size: var(--font-size-sm);
  overflow-wrap: anywhere;
}
.invites__text span {
  color: var(--color-text-secondary);
}
.invites__actions {
  display: flex;
  gap: var(--space-2);
}
.invites__error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
</style>
