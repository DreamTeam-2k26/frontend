<script setup>
import { personName } from '@/components/projects/memberRules'
import { getInitials } from '@/utils/user'
import MemberActions from './MemberActions.vue'
import { roles } from './teamState'
defineProps({
  members: { type: Array, required: true },
  actorRole: { type: String, required: true },
  busy: Boolean,
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
    <tbody>
      <tr v-for="member in members" :key="member.id">
        <td>
          <span class="person"
            ><span class="avatar" aria-hidden="true">{{
              getInitials(personName(member.user_name, member.user_email)) || '?'
            }}</span
            >{{ personName(member.user_name, member.user_email) }}</span
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
    </tbody>
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
.avatar {
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--color-secondary);
  font-size: var(--font-size-xs);
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
</style>
