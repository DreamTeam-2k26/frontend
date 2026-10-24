<script setup>
import { ref, watch } from 'vue'
import { MoreHorizontal } from 'lucide-vue-next'
import { canChangeRole, canRemove } from './teamState'
const props = defineProps({
  member: { type: Object, required: true },
  actorRole: { type: String, required: true },
  disabled: Boolean,
})
const emit = defineEmits(['action'])
const menu = ref(null)
function choose(action) {
  menu.value.open = false
  emit('action', { member: props.member, action })
}
function close() {
  menu.value.open = false
  menu.value.querySelector('summary').focus()
}
watch(
  () => props.actorRole,
  () => {
    if (menu.value) menu.value.open = false
  },
)
</script>
<template>
  <details ref="menu" class="member-actions" @keydown.esc.prevent="close">
    <summary :aria-label="`Ações de ${member.user_name || member.user_email}`">
      <MoreHorizontal :size="18" aria-hidden="true" />
    </summary>
    <div class="member-actions__menu">
      <template v-if="canChangeRole(actorRole, member.role)">
        <button
          type="button"
          :disabled="disabled"
          @click="choose(member.role === 'admin' ? 'member' : 'admin')"
        >
          {{ member.role === 'admin' ? 'Tornar membro' : 'Tornar administrador' }}
        </button>
        <button type="button" :disabled="disabled" @click="choose('owner')">
          Transferir propriedade
        </button>
      </template>
      <button
        v-if="canRemove(actorRole, member.role)"
        type="button"
        class="danger"
        :disabled="disabled"
        @click="choose('remove')"
      >
        Remover participante
      </button>
      <p v-if="!canChangeRole(actorRole, member.role) && !canRemove(actorRole, member.role)">
        {{
          member.role === 'owner'
            ? 'A propriedade só muda por transferência do dono.'
            : 'Seu papel não permite administrar este participante.'
        }}
      </p>
    </div>
  </details>
</template>
<style scoped>
.member-actions {
  position: relative;
}
summary {
  display: grid;
  place-items: center;
  min-width: 2.75rem;
  min-height: 2.75rem;
  cursor: pointer;
  list-style: none;
}
summary::-webkit-details-marker {
  display: none;
}
.member-actions__menu {
  position: absolute;
  right: 0;
  top: 100%;
  z-index: 3;
  width: min(17rem, 70vw);
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}
button {
  display: block;
  width: 100%;
  text-align: left;
  padding: var(--space-3);
  min-height: 2.75rem;
}
button:hover {
  background: var(--color-bg-subtle);
}
p {
  padding: var(--space-3);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.danger {
  color: var(--color-danger);
}
</style>
