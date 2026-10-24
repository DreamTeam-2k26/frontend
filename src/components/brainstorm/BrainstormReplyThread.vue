<script setup>
import { computed, useTemplateRef } from 'vue'
import { Lock } from 'lucide-vue-next'
import BrainstormReplyComposer from './BrainstormReplyComposer.vue'
import BrainstormReplyItem from './BrainstormReplyItem.vue'
import { useBrainstormTopicStore } from '@/stores/brainstormTopic'
import { buildThread } from '@/utils/brainstorm'

// Conversa da discussão: respostas em níveis + campo de nova resposta (só com a discussão aberta).
const {
  flags,
  userId = null,
  highlighted = null,
} = defineProps({
  flags: { type: Object, required: true },
  userId: { type: Number, default: null },
  highlighted: { type: Number, default: null },
})

const store = useBrainstormTopicStore()
const tree = computed(() => buildThread(store.replies))
const composer = useTemplateRef('composer')
const total = computed(() => store.replies.length)

async function publish(content) {
  const done = await store.addReply({ content }).catch(() => false)
  if (done) composer.value?.clear()
}
</script>

<template>
  <section class="thread" aria-labelledby="thread-title">
    <h2 id="thread-title" class="thread__title">
      Respostas <span class="thread__count">({{ total }})</span>
    </h2>

    <ul v-if="tree.length" class="thread__list">
      <BrainstormReplyItem
        v-for="node in tree"
        :key="node.reply.id"
        :node="node"
        :flags="flags"
        :user-id="userId"
        :highlighted="highlighted"
      />
    </ul>
    <p v-else class="thread__empty">
      {{
        flags.canReply
          ? 'Ninguém respondeu ainda. Comece a conversa!'
          : 'Esta discussão não teve respostas.'
      }}
    </p>

    <BrainstormReplyComposer
      v-if="flags.canReply"
      ref="composer"
      label="Escreva sua resposta…"
      :busy="Boolean(store.busy['reply-root'])"
      @submit="publish"
    />
    <p v-else class="thread__closed" role="note">
      <Lock :size="15" aria-hidden="true" />
      {{
        store.topic?.status === 'archived'
          ? 'Discussão arquivada: o histórico fica preservado, somente leitura.'
          : 'Debate encerrado: respostas e votos estão fechados até a discussão ser reaberta.'
      }}
    </p>
  </section>
</template>

<style scoped>
.thread {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.thread__title {
  font-size: var(--font-size-md);
}
.thread__count {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-regular);
}
.thread__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.thread__empty,
.thread__closed {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.thread__closed {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}
</style>
