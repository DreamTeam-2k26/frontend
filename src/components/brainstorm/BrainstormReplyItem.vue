<script setup>
import { computed, shallowRef } from 'vue'
import { Pencil, Reply, Trash2 } from 'lucide-vue-next'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import BrainstormReplyComposer from './BrainstormReplyComposer.vue'
import BrainstormVoteControl from './BrainstormVoteControl.vue'
import { useBrainstormTopicStore } from '@/stores/brainstormTopic'
import { formatWhen } from '@/utils/brainstorm'

// Uma resposta e seus filhos (recursivo). Ações vão direto para a store da discussão aberta.
const {
  node,
  depth = 0,
  flags,
  userId = null,
  highlighted = null,
} = defineProps({
  node: { type: Object, required: true }, // { reply, children }
  depth: { type: Number, default: 0 },
  flags: { type: Object, required: true }, // topicFlags()
  userId: { type: Number, default: null },
  highlighted: { type: Number, default: null },
})

const store = useBrainstormTopicStore()
const reply = computed(() => node.reply)
const author = computed(() => reply.value.author_name || 'Usuário removido')
const isAuthor = computed(() => reply.value.author != null && reply.value.author === userId)
const canEdit = computed(() => flags.isOpen && isAuthor.value)
const canDelete = computed(
  () => flags.isOpen && !node.children.length && (isAuthor.value || flags.isManager),
)
const edited = computed(
  () => reply.value.updated_at && reply.value.updated_at !== reply.value.created_at,
)

const mode = shallowRef(null) // null | 'reply' | 'edit'
const confirming = shallowRef(false)

async function answer(content) {
  const done = await store.addReply({ content, parent: reply.value.id }).catch(() => false)
  if (done) mode.value = null
}

async function save(content) {
  const done = await store.editReply(reply.value, content).catch(() => null)
  if (done) mode.value = null
}

async function remove() {
  await store.removeReply(reply.value).catch(() => {})
  confirming.value = false
}
</script>

<template>
  <li
    class="reply"
    :class="{ 'reply--nested': depth > 0, 'reply--highlight': highlighted === reply.id }"
  >
    <article
      :id="`resposta-${reply.id}`"
      class="reply__card"
      tabindex="-1"
      :aria-label="`Resposta de ${author}`"
    >
      <header class="reply__header">
        <UserAvatar :name="author" :src="''" size="sm" />
        <div class="reply__who">
          <strong>{{ author }}</strong>
          <span class="reply__when">
            <span class="reply__ref">#R{{ reply.id }}</span> ·
            <time :datetime="reply.created_at">{{ formatWhen(reply.created_at) }}</time>
            <template v-if="edited"> · editada</template>
          </span>
        </div>
      </header>

      <BrainstormReplyComposer
        v-if="mode === 'edit'"
        :initial="reply.content"
        label="Editar resposta"
        submit-label="Salvar"
        cancelable
        autofocus
        :busy="Boolean(store.busy[`edit-${reply.id}`])"
        @submit="save"
        @cancel="mode = null"
      />
      <p v-else class="reply__content">{{ reply.content }}</p>

      <footer class="reply__actions">
        <BrainstormVoteControl
          :score="reply.score"
          :my-vote="reply.my_vote"
          :disabled="!flags.canVote"
          :busy="Boolean(store.busy[`vote-${reply.id}`])"
          :label="`resposta de ${author}`"
          @vote="store.voteReply(reply, $event).catch(() => {})"
        />
        <button
          v-if="flags.canReply && mode !== 'reply'"
          type="button"
          class="reply__action"
          @click="mode = 'reply'"
        >
          <Reply :size="15" aria-hidden="true" /> Responder
        </button>
        <button
          v-if="canEdit && mode !== 'edit'"
          type="button"
          class="reply__action"
          @click="mode = 'edit'"
        >
          <Pencil :size="15" aria-hidden="true" /> Editar
        </button>
        <button
          v-if="canDelete"
          type="button"
          class="reply__action reply__action--danger"
          @click="confirming = true"
        >
          <Trash2 :size="15" aria-hidden="true" /> Excluir
        </button>
      </footer>

      <BrainstormReplyComposer
        v-if="mode === 'reply'"
        :label="`Responder a ${author}`"
        cancelable
        autofocus
        :busy="Boolean(store.busy[`reply-${reply.id}`])"
        @submit="answer"
        @cancel="mode = null"
      />
    </article>

    <ul v-if="node.children.length" class="reply__children">
      <BrainstormReplyItem
        v-for="child in node.children"
        :key="child.reply.id"
        :node="child"
        :depth="depth + 1"
        :flags="flags"
        :user-id="userId"
        :highlighted="highlighted"
      />
    </ul>

    <ConfirmDialog
      v-if="confirming"
      title="Excluir resposta"
      :message="`Excluir a resposta de ${author}? Essa ação não pode ser desfeita.`"
      confirm-label="Excluir resposta"
      :busy="Boolean(store.busy[`delete-${reply.id}`])"
      @confirm="remove"
      @cancel="confirming = false"
    />
  </li>
</template>

<style scoped>
.reply {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.reply__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  transition: border-color 0.2s ease;
}
.reply__card:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.reply--highlight > .reply__card {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}
.reply__header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.reply__who {
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-size: var(--font-size-sm);
}
.reply__when {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.reply__ref {
  font-weight: var(--font-weight-medium);
}
.reply__content {
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.reply__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}
.reply__action {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 2rem;
  padding: 0 var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  border-radius: var(--radius-sm);
}
.reply__action:hover {
  color: var(--color-text);
  background: var(--color-bg-hover);
}
.reply__action--danger:hover {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}
/* Níveis da conversa: recuo com linha guia; no celular o recuo é menor. */
.reply__children {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-left: var(--space-5);
  padding-left: var(--space-4);
  border-left: 2px solid var(--color-border);
}
@media (max-width: 600px) {
  .reply__children {
    margin-left: var(--space-2);
    padding-left: var(--space-2);
  }
}
</style>
