<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Plus, Search } from 'lucide-vue-next'
import { getProject } from '@/api/projects'
import { listMemberships, changeMemberRole, removeMember } from '@/api/memberships'
import { listInvites, revokeInvite } from '@/api/invites'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import MemberList from '@/components/members/MemberList.vue'
import TeamDialog from '@/components/members/TeamDialog.vue'
import InviteModal from '@/components/invites/InviteModal.vue'
import InviteList from '@/components/invites/InviteList.vue'
import {
  filterMembers,
  isManager,
  canChangeRole,
  canRemove,
  teamError,
  roles,
} from '@/components/members/teamState'
import { useConnection } from '@/composables/useConnection'
import { useAuthStore } from '@/stores/auth'
const route = useRoute(),
  auth = useAuthStore()
const project = ref(null),
  members = ref([]),
  invites = ref([]),
  search = ref('')
const loading = ref(true),
  refreshing = ref(false),
  busy = ref(false),
  modal = ref(false),
  confirmation = ref(null)
const error = ref(''),
  memberError = ref(''),
  inviteError = ref(''),
  actionError = ref(''),
  message = ref('')
const manager = computed(() => isManager(project.value?.role))
const visible = computed(() => filterMembers(members.value, search.value))
const { offline } = useConnection(() => load())
let generation = 0,
  controller
async function load(clear = false) {
  const current = ++generation
  controller?.abort()
  controller = new AbortController()
  const options = { signal: controller.signal }
  if (clear) {
    project.value = null
    members.value = []
    invites.value = []
    modal.value = false
    confirmation.value = null
    search.value = ''
    actionError.value = ''
    message.value = ''
  }
  loading.value = !project.value
  refreshing.value = true
  error.value = ''
  memberError.value = ''
  inviteError.value = ''
  const id = String(route.params.id)
  if (!/^\d+$/.test(id)) {
    error.value = 'Projeto não encontrado. Confira o endereço.'
    loading.value = false
    refreshing.value = false
    return
  }
  if (offline.value) {
    loading.value = false
    refreshing.value = false
    return
  }
  try {
    const data = await getProject(id, options)
    if (current !== generation) return
    project.value = data
    if (!isManager(data.role)) {
      invites.value = []
      modal.value = false
    }
    const [team, invitations] = await Promise.allSettled([
      listMemberships(id, options),
      isManager(data.role) ? listInvites(id, options) : Promise.resolve([]),
    ])
    if (current !== generation) return
    members.value = team.status === 'fulfilled' ? team.value : []
    invites.value = invitations.status === 'fulfilled' ? invitations.value : []
    if (team.status === 'rejected') memberError.value = teamError(team.reason)
    if (invitations.status === 'rejected') inviteError.value = teamError(invitations.reason)
  } catch (cause) {
    if (current === generation) {
      error.value = teamError(cause)
      project.value = null
      members.value = []
      invites.value = []
      modal.value = false
    }
  } finally {
    if (current === generation) {
      loading.value = false
      refreshing.value = false
    }
  }
}
watch(
  () => [route.params.id, auth.user?.id],
  () => load(true),
  { immediate: true },
)
onBeforeUnmount(() => {
  clearTimeout(changedTimer)
  generation++
  controller?.abort()
})
function askMember({ member, action }) {
  if (busy.value || refreshing.value || offline.value) return
  if (
    action === 'remove'
      ? !canRemove(project.value.role, member.role)
      : !canChangeRole(project.value.role, member.role)
  )
    return
  confirmation.value = { member, action }
}
const confirmationText = computed(() => {
  const value = confirmation.value
  if (!value) return ''
  if (value.invite) return 'Revogar este convite? Ele deixará de permitir a entrada no projeto.'
  const name = value.member.user_name || value.member.user_email
  if (value.action === 'owner')
    return `Transferir a propriedade para ${name}? Você passará a administrador e perderá as ações exclusivas do dono.`
  if (value.action === 'remove')
    return `Remover ${name} do projeto? Essa pessoa perderá acesso e suas atribuições serão atualizadas pelo servidor.`
  return `Alterar o papel de ${name} para ${roles[value.action]}?`
})
// Linha cujo papel a API acabou de confirmar: destaque breve na tabela.
const changedId = ref(null)
let changedTimer
async function confirm() {
  if (busy.value || offline.value || !confirmation.value) return
  const current = generation,
    choice = confirmation.value
  busy.value = true
  actionError.value = ''
  message.value = ''
  try {
    if (choice.invite) await revokeInvite(choice.invite.id)
    else if (choice.action === 'remove') await removeMember(choice.member.id)
    else await changeMemberRole(choice.member.id, choice.action)
    if (current !== generation) return
    confirmation.value = null
    message.value = 'Alteração salva com sucesso.'
    window.dispatchEvent(new Event('projects:changed'))
    await load()
    if (current === generation && !choice.invite && choice.action !== 'remove') {
      changedId.value = choice.member.id
      clearTimeout(changedTimer)
      changedTimer = setTimeout(() => (changedId.value = null), 2400)
    }
  } catch (cause) {
    if (current === generation) {
      confirmation.value = null
      actionError.value = teamError(cause)
      await load()
    }
  } finally {
    busy.value = false
  }
}
function invitationCreated() {
  message.value = 'Convite criado com sucesso.'
  load()
}
function permissionError() {
  modal.value = false
  load()
}
</script>
<template>
  <section class="project-members" aria-labelledby="members-title">
    <nav class="breadcrumbs" aria-label="Navegação do projeto">
      <RouterLink :to="{ name: 'projects' }">Meus Projetos</RouterLink
      ><template v-if="project"
        ><span aria-hidden="true">/</span
        ><RouterLink :to="{ name: 'project-detail', params: { id: project.id } }">{{
          project.name
        }}</RouterLink
        ><span aria-hidden="true">/</span><span>Participantes</span></template
      >
    </nav>
    <header>
      <div>
        <h1 id="members-title">Participantes</h1>
        <p>
          Pessoas que colaboram neste projeto<span v-if="project">: {{ project.name }}</span
          >.
        </p>
      </div>
      <BaseButton v-if="manager" :disabled="offline || busy || refreshing" @click="modal = true"
        ><Plus :size="16" aria-hidden="true" />Convidar membro</BaseButton
      >
    </header>
    <p v-if="offline" role="status" class="notice">
      Você está offline. Reconecte-se para atualizar participantes e convites.
    </p>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="actionError" class="error" role="alert">{{ actionError }}</p>
    <p v-if="loading" role="status" aria-busy="true">Carregando projeto e participantes…</p>
    <div v-else-if="error" role="alert" class="notice">
      <p>{{ error }}</p>
      <BaseButton variant="secondary" :disabled="offline" @click="load()"
        >Tentar novamente</BaseButton
      >
    </div>
    <template v-else-if="project"
      ><div class="toolbar">
        <BaseInput
          v-model="search"
          label="Buscar participantes"
          type="search"
          placeholder="Nome ou e-mail…"
          :icon="Search"
        />
        <p v-if="!memberError">
          {{ search.trim() ? `${visible.length} de ` : '' }}{{ members.length }} participantes
        </p>
      </div>
      <div v-if="memberError" role="alert" class="notice">
        <p>{{ memberError }}</p>
        <BaseButton variant="secondary" :loading="refreshing" :disabled="offline" @click="load()"
          >Tentar novamente</BaseButton
        >
      </div>
      <p v-else-if="!visible.length" role="status">
        {{
          search.trim()
            ? 'Nenhum participante encontrado para esta busca.'
            : 'Nenhum participante encontrado.'
        }}
      </p>
      <MemberList
        v-else
        :members="visible"
        :actor-role="project.role"
        :busy="busy || refreshing || offline"
        :highlight-id="changedId"
        @action="askMember"
      />
      <template v-if="manager"
        ><div v-if="inviteError" role="alert" class="notice">
          <p>{{ inviteError }}</p>
          <BaseButton variant="secondary" :loading="refreshing" :disabled="offline" @click="load()"
            >Recarregar convites</BaseButton
          >
        </div>
        <InviteList
          v-else
          :invites="invites"
          :busy="busy || refreshing"
          :offline="offline"
          @revoke="confirmation = { invite: $event }"
      /></template>
      <InviteModal
        v-if="modal && manager"
        :key="`${project.id}:${project.role}`"
        :project-id="project.id"
        :actor-role="project.role"
        @close="modal = false"
        @created="invitationCreated"
        @permission-error="permissionError"
      />
    </template>
    <TeamDialog
      v-if="confirmation"
      title="Confirmar alteração"
      :busy="busy"
      @close="confirmation = null"
      ><p>{{ confirmationText }}</p>
      <div class="confirmation-actions">
        <BaseButton variant="secondary" :disabled="busy" @click="confirmation = null"
          >Cancelar</BaseButton
        ><BaseButton :loading="busy" :disabled="offline" @click="confirm">Confirmar</BaseButton>
      </div></TeamDialog
    >
  </section>
</template>
<style scoped>
.project-members {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-8) var(--space-6);
  overflow-wrap: anywhere;
}
.breadcrumbs,
header,
.toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
}
.breadcrumbs {
  justify-content: start;
  font-size: var(--font-size-xs);
}
a {
  color: var(--color-primary);
}
h1 {
  font-size: var(--font-size-xl);
  margin-bottom: var(--space-2);
}
p {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.toolbar > :first-child {
  width: min(100%, 22rem);
}
.notice {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  display: grid;
  gap: var(--space-3);
  background: var(--color-bg-card);
}
.error {
  color: var(--color-danger);
}
.confirmation-actions {
  display: flex;
  justify-content: end;
  gap: var(--space-3);
  margin-top: var(--space-5);
}
@media (max-width: 700px) {
  .project-members {
    padding: var(--space-5) var(--space-4);
  }
  header {
    flex-direction: column;
    align-items: start;
  }
}
</style>
