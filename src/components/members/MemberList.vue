<script setup>
import { personName } from '@/components/projects/memberRules'
import UserAvatar from '@/components/user/UserAvatar.vue'
import MemberActions from './MemberActions.vue'
import { roles } from './teamState'
defineProps({
  members: { type: Array, required: true },
  actorRole: { type: String, required: true },
  busy: Boolean,
  // Participante alterado com sucesso há pouco: a linha recebe um destaque breve.
  highlightId: { type: [Number, String], default: null },
})
defineEmits(['action'])
</script>
<template>
  <table class="member-list">
    <caption class="sr-only">
      Participantes do projeto
    </caption>
    <thead>
      <tr>
        <th scope="col">Nome</th>
        <th scope="col">E-mail</th>
        <th scope="col">Papel</th>
        <th scope="col"><span class="sr-only">Ações</span></th>
      </tr>
    </thead>
    <!-- Linha removida sai com fade; as demais seguem pela identidade (id). -->
    <TransitionGroup tag="tbody" name="member-row">
      <tr
        v-for="member in members"
        :key="member.id"
        :class="{ 'member-list__row--changed': highlightId != null && member.id === highlightId }"
      >
        <td>
          <span class="person"
            ><UserAvatar
              :name="personName(member.user_name, member.user_email)"
              :src="member.user_profile_picture || ''"
              size="sm"
            />{{ personName(member.user_name, member.user_email) }}</span
          >
        </td>
        <td class="email">{{ member.user_email }}</td>
        <td>
          <span class="badge">{{ roles[member.role] || 'Não informado' }}</span>
        </td>
        <td class="actions">
          <MemberActions
            :member="member"
            :actor-role="actorRole"
            :disabled="busy"
            @action="$emit('action', $event)"
          />
        </td>
      </tr>
    </TransitionGroup>
  </table>
</template>
<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.member-list {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  font-size: var(--font-size-sm);
}
th {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: var(--font-size-xs);
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
}
th,
td {
  padding: var(--space-2) var(--space-4);
  text-align: left;
  overflow-wrap: anywhere;
}
td {
  border-top: 1px solid var(--color-border);
}
.email {
  color: var(--color-text-secondary);
}
.person {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-bg-subtle);
  font-size: var(--font-size-xs);
}
.actions {
  width: 4rem;
}
@media (max-width: 700px) {
  table,
  tbody {
    display: block;
  }
  thead {
    display: none;
  }
  tr {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    padding: var(--space-3);
    border-bottom: 1px solid var(--color-border);
  }
  td {
    display: block;
    border: none;
    grid-column: 1;
    padding: var(--space-2);
  }
  .actions {
    grid-column: 2;
    grid-row: 1 / 4;
    width: auto;
  }
}

.member-row-leave-active {
  transition: opacity var(--motion-quick) var(--ease-flow-exit);
}
.member-row-leave-to {
  opacity: 0;
}
.member-list__row--changed > td {
  animation: member-row-changed 2.4s var(--ease-flow) both;
}
@keyframes member-row-changed {
  from,
  25% {
    background-color: var(--color-success-soft);
  }
}
</style>
