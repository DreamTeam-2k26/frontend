<script setup>
import { computed, getCurrentInstance } from 'vue'
import { ArrowRight, Video } from 'lucide-vue-next'
import MeetingGoogleCalendar from './MeetingGoogleCalendar.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { canInvite } from '@/components/projects/memberRules'
import { formatWhen, isLive, participantsText } from '../lib/callRules'
import { useCallNotifier } from '../stores/callNotifier'

// Conteúdo do cartão "Próxima reunião" da visão geral: chamada em andamento ou a próxima agendada.
const props = defineProps({ project: { type: Object, required: true } })

// Sem Pinia (renderização isolada, como nos testes do cartão do projeto) mostra só o texto padrão.
const notifier = getCurrentInstance()?.appContext.config.globalProperties.$pinia
  ? useCallNotifier()
  : null
const next = computed(() => notifier?.nextFor(props.project.id) ?? null)
const live = computed(() => isLive(next.value))
const manager = computed(() => canInvite(props.project.role))
const tab = computed(() => ({
  name: 'project-detail',
  params: { id: props.project.id },
  query: { aba: 'reunioes' },
}))
</script>

<template>
  <div class="next">
    <p v-if="!notifier" class="next__when">Nenhuma reunião disponível.</p>
    <template v-else-if="next">
      <p class="next__title">{{ next.title }}</p>
      <p class="next__when">
        <template v-if="live"
          >Em andamento · {{ participantsText(next.participants_count) }}</template
        >
        <template v-else>{{ formatWhen(next.scheduled_for) }}</template>
      </p>
      <BaseButton v-if="live" :to="{ name: 'call', params: { id: project.id, callId: next.id } }"
        ><Video :size="16" aria-hidden="true" /> Entrar na reunião</BaseButton
      >
      <BaseButton v-else variant="secondary" :to="tab"
        ><ArrowRight :size="16" aria-hidden="true" /> Ver reuniões</BaseButton
      >
      <MeetingGoogleCalendar v-if="!live" :call="next" :project="project" />
    </template>
    <template v-else>
      <p class="next__when">Nenhuma reunião disponível.</p>
      <BaseButton variant="secondary" :to="tab"
        ><ArrowRight :size="16" aria-hidden="true" />
        {{ manager ? 'Iniciar ou agendar' : 'Ver reuniões' }}</BaseButton
      >
    </template>
  </div>
</template>

<style scoped>
.next {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

.next__title {
  color: var(--color-text);
  font-weight: var(--font-weight-medium);
  overflow-wrap: anywhere;
}

.next__when {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
</style>
