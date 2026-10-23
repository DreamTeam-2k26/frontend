<script setup>
import { computed, ref, onBeforeUnmount } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
  formatDate,
  inviteStatus,
  inviteUrl,
  usableLink,
  roles,
  statuses,
} from '@/components/members/teamState'
const props = defineProps({
  invites: { type: Array, required: true },
  busy: Boolean,
  offline: Boolean,
})
defineEmits(['revoke'])
const now = ref(Date.now()),
  feedback = ref('')
const timer = setInterval(() => (now.value = Date.now()), 1000)
onBeforeUnmount(() => clearInterval(timer))
const pending = computed(
  () => props.invites.filter((invite) => inviteStatus(invite, now.value) === 'pending').length,
)
async function copy(invite) {
  if (!usableLink(invite)) {
    feedback.value = 'Este link não está mais disponível.'
    return
  }
  try {
    await navigator.clipboard.writeText(inviteUrl(invite.token))
    feedback.value = 'Link copiado.'
  } catch {
    feedback.value =
      'Não foi possível copiar automaticamente. Selecione o endereço no campo para copiar.'
  }
}
</script>
<template>
  <section class="invites" aria-labelledby="pending-title">
    <header>
      <h2 id="pending-title">Convites pendentes</h2>
      <span class="badge">{{ pending }} {{ pending === 1 ? 'pendente' : 'pendentes' }}</span>
    </header>
    <p>Convites diretos e links do projeto, incluindo o histórico de respostas.</p>
    <p v-if="feedback" role="status">{{ feedback }}</p>
    <p v-if="!invites.length">Nenhum convite enviado.</p>
    <ul v-else>
      <li v-for="invite in invites" :key="invite.id">
        <div class="invite-info">
          <strong>{{
            invite.kind === 'link'
              ? 'Link compartilhável'
              : invite.invited_user_name || 'Pessoa convidada'
          }}</strong>
          <p>
            {{ invite.kind === 'link' ? 'Por link' : 'Convite direto no Fluxo' }} ·
            {{ roles[invite.role] }} ·
            {{ statuses[inviteStatus(invite, now)] || 'Estado desconhecido' }}
          </p>
          <p>
            Criado: {{ formatDate(invite.created_at) }} ·
            {{
              invite.expires_at
                ? `Válido até ${formatDate(invite.expires_at)}`
                : 'Sem expiração informada'
            }}
          </p>
          <label v-if="usableLink(invite, now)" class="copy-field"
            >Link de convite<input
              :value="inviteUrl(invite.token)"
              readonly
              @focus="$event.target.select()"
          /></label>
        </div>
        <div class="actions">
          <BaseButton
            v-if="usableLink(invite, now)"
            variant="secondary"
            :disabled="busy || offline"
            @click="copy(invite)"
            >Copiar link</BaseButton
          ><BaseButton
            v-if="inviteStatus(invite, now) === 'pending'"
            variant="ghost"
            :disabled="busy || offline"
            @click="$emit('revoke', invite)"
            >Revogar</BaseButton
          >
        </div>
      </li>
    </ul>
  </section>
</template>
<style scoped>
.invites {
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
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
  font-size: var(--font-size-sm);
}
p,
label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-block: var(--space-2);
  overflow-wrap: anywhere;
}
.badge {
  background: var(--color-warning-soft);
  color: var(--color-warning);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
}
li {
  align-items: start;
  padding-top: var(--space-3);
  margin-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}
.invite-info {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
strong {
  font-size: var(--font-size-sm);
}
.copy-field {
  display: grid;
  gap: var(--space-1);
}
input {
  width: 100%;
  min-width: 0;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-input-bg);
  color: var(--color-text);
}
.actions {
  flex-wrap: wrap;
  justify-content: end;
}
@media (max-width: 700px) {
  li {
    flex-direction: column;
  }
  .invite-info {
    width: 100%;
  }
}
</style>
