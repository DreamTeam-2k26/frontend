<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Trash2, UserPlus } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import ChatAvatar from '@/features/chat/components/ChatAvatar.vue'
import UserPicker from '@/components/projects/UserPicker.vue'
import { useChatStore } from '@/features/chat/stores/chat'
import {
  inviteUser,
  listMembers,
  listPendingInvites,
  removeMember,
  revokeInvite,
  setMemberRole,
} from '@/api/projectMembers'
import {
  apiMessage,
  canChangeRole,
  canInvite,
  canRemove,
  inviteMany,
  inviteSummary,
  personName,
  roleLabel,
} from '@/components/projects/memberRules'

const props = defineProps({ project: { type: Object, required: true } })
const emit = defineEmits(['changed'])

const chat = useChatStore()
const meId = computed(() => chat.me?.id ?? null)
const myRole = computed(() => props.project.role)
const manager = computed(() => canInvite(myRole.value))

const members = ref([])
const pending = ref([])
const loading = ref(true)
const loadError = ref('')
const message = ref('')
const problem = ref('')
const busy = ref(false)
const confirmId = ref(null)
const invitees = ref([])
let active = true

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [list, invites] = await Promise.all([
      listMembers(props.project.id),
      manager.value ? listPendingInvites(props.project.id) : Promise.resolve([]),
    ])
    if (!active) return
    members.value = list
    pending.value = invites
  } catch (cause) {
    if (active) loadError.value = apiMessage(cause, 'Não foi possível carregar os participantes.')
  } finally {
    if (active) loading.value = false
  }
}

async function run(action, success) {
  if (busy.value) return
  busy.value = true
  message.value = ''
  problem.value = ''
  try {
    await action()
    if (!active) return
    if (success) message.value = success
    await load()
    emit('changed')
  } catch (cause) {
    if (active) problem.value = apiMessage(cause, 'Não foi possível concluir a ação.')
    await load()
  } finally {
    busy.value = false
    confirmId.value = null
  }
}

const changeRole = (member, role) =>
  run(
    () => setMemberRole(member.id, role),
    `${personName(member.user_name, member.user_email)} agora é ${roleLabel(role).toLowerCase()}.`,
  )

const remove = (member) =>
  run(
    () => removeMember(member.id),
    `${personName(member.user_name, member.user_email)} foi removido do projeto.`,
  )

const revoke = (invite) => run(() => revokeInvite(invite.id), 'Convite cancelado.')

async function sendInvites() {
  if (busy.value || !invitees.value.length) return
  busy.value = true
  message.value = ''
  problem.value = ''
  try {
    const result = await inviteMany(props.project.id, invitees.value, inviteUser)
    if (!active) return
    message.value = result.sent.length ? inviteSummary({ sent: result.sent, failed: [] }) : ''
    problem.value = result.failed.length ? inviteSummary({ sent: [], failed: result.failed }) : ''
    invitees.value = result.failed.map((item) => item.user)
    await load()
  } finally {
    busy.value = false
  }
}

onMounted(load)
onBeforeUnmount(() => {
  active = false
})
</script>

<template>
  <section class="members" aria-labelledby="members-title">
    <h2 id="members-title">Participantes</h2>

    <p v-if="message" class="members__ok" role="status">{{ message }}</p>
    <p v-if="problem" class="members__error" role="alert">{{ problem }}</p>

    <p v-if="loading && !members.length" role="status">Carregando participantes…</p>
    <div v-else-if="loadError" class="members__error" role="alert">
      <p>{{ loadError }}</p>
      <BaseButton variant="secondary" @click="load">Tentar novamente</BaseButton>
    </div>
    <ul v-else class="members__list">
      <li v-for="member in members" :key="member.id">
        <ChatAvatar :name="personName(member.user_name, member.user_email)" :size="36" />
        <div class="members__who">
          <strong
            >{{ personName(member.user_name, member.user_email)
            }}<small v-if="member.user === meId"> (você)</small></strong
          >
          <span>{{ member.user_email }}</span>
        </div>
        <label v-if="canChangeRole(myRole, member)" class="members__role">
          <span class="sr-only"
            >Papel de {{ personName(member.user_name, member.user_email) }}</span
          >
          <select
            :value="member.role"
            :disabled="busy"
            @change="changeRole(member, $event.target.value)"
          >
            <option value="member">Membro</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <span v-else class="members__badge">{{ roleLabel(member.role) }}</span>

        <template v-if="canRemove(myRole, member, meId)">
          <BaseButton
            v-if="confirmId !== member.id"
            variant="secondary"
            :disabled="busy"
            :aria-label="`Remover ${personName(member.user_name, member.user_email)}`"
            @click="confirmId = member.id"
            ><Trash2 :size="16" aria-hidden="true"
          /></BaseButton>
          <span v-else class="members__confirm">
            <BaseButton variant="secondary" :disabled="busy" @click="confirmId = null"
              >Cancelar</BaseButton
            >
            <BaseButton :loading="busy" @click="remove(member)">Remover</BaseButton>
          </span>
        </template>
      </li>
    </ul>

    <template v-if="manager">
      <h3>Convites pendentes</h3>
      <p v-if="!pending.length && !loading" class="members__muted">Nenhum convite pendente.</p>
      <ul class="members__list">
        <li v-for="invite in pending" :key="invite.id">
          <div class="members__who">
            <strong>{{ invite.invited_user_name || 'Usuário' }}</strong>
            <span>Aguardando resposta · {{ roleLabel(invite.role) }}</span>
          </div>
          <BaseButton variant="secondary" :disabled="busy" @click="revoke(invite)"
            >Cancelar convite</BaseButton
          >
        </li>
      </ul>

      <h3>Convidar pessoas</h3>
      <UserPicker
        v-model="invitees"
        label="Buscar por nome ou e-mail"
        :exclude-project="project.id"
        :disabled="busy"
      />
      <div class="members__send">
        <BaseButton :disabled="!invitees.length" :loading="busy" @click="sendInvites"
          ><UserPlus :size="16" aria-hidden="true" /> Enviar convites</BaseButton
        >
        <small>Entram como Membro ao aceitar. Você pode promover depois.</small>
      </div>
    </template>
  </section>
</template>

<style scoped>
.members {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
}
h2 {
  font-size: var(--font-size-lg);
}
h3 {
  margin-top: var(--space-3);
  font-size: var(--font-size-md);
}
.members__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.members__list li {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}
.members__who {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 10rem;
  overflow-wrap: anywhere;
}
.members__who span,
.members__muted,
.members__send small,
small {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.members__badge {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-bg-card);
  font-size: var(--font-size-xs);
}
.members__role select {
  padding: var(--space-2) var(--space-3);
}
.members__confirm,
.members__send {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.members__ok {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-success-soft);
  color: var(--color-success);
  font-size: var(--font-size-sm);
}
.members__error {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-danger-soft);
  color: var(--color-danger);
  font-size: var(--font-size-sm);
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
