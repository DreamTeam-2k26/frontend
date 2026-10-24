<script setup>
import { computed, onMounted, ref } from 'vue'
import { Download, Sparkles, X } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import { apiErrorMessage } from '../../chat/lib/errors'
import { saveTextFile } from '../lib/download'
import { summaryBlocks } from '../lib/summaryMarkdown'
import { downloadName, mergeSegments, toDocument } from '../lib/transcript'
import { getTranscript, summarizeCall } from '../services/callsApi'
import TranscriptList from './TranscriptList.vue'

// Transcrição completa de uma reunião encerrada, com resumo por IA (opcional) e download.
const props = defineProps({
  call: { type: Object, required: true },
  canManage: Boolean,
})
const emit = defineEmits(['close', 'summarized'])

const dialog = ref(null)
const loading = ref(true)
const error = ref('')
const segments = ref([])
const summary = ref('')
const available = ref(false)
const summarizing = ref(false)
const summaryError = ref('')

const blocks = computed(() => summaryBlocks(summary.value))

async function load() {
  loading.value = true
  error.value = ''

  try {
    const data = await getTranscript(props.call.id)

    segments.value = mergeSegments([], data.segments)
    summary.value = data.summary || ''
    available.value = !!data.summary_available
  } catch (failure) {
    error.value = apiErrorMessage(failure, 'Não foi possível carregar a transcrição.')
  } finally {
    loading.value = false
  }
}

async function summarize() {
  if (summarizing.value) return

  summarizing.value = true
  summaryError.value = ''

  try {
    const data = await summarizeCall(props.call.id)

    summary.value = data.summary
    emit('summarized', props.call.id)
  } catch (failure) {
    summaryError.value = apiErrorMessage(failure, 'Não foi possível gerar o resumo agora.')
  } finally {
    summarizing.value = false
  }
}

function download(format) {
  const text = toDocument(props.call, segments.value, { format, summary: summary.value })

  saveTextFile(
    downloadName(props.call, format),
    text,
    format === 'md' ? 'text/markdown' : 'text/plain',
  )
}

onMounted(() => {
  dialog.value?.showModal()
  load()
})
</script>

<template>
  <dialog
    ref="dialog"
    class="tdialog dialog-motion"
    aria-labelledby="tdialog-title"
    @close="emit('close')"
    @click.self="dialog.close()"
  >
    <header class="tdialog__header">
      <h2 id="tdialog-title">{{ call.title }}</h2>
      <button type="button" class="tdialog__close" aria-label="Fechar" @click="dialog.close()">
        <X :size="18" aria-hidden="true" />
      </button>
    </header>

    <p v-if="loading" class="tdialog__state" role="status">Carregando transcrição…</p>
    <p v-else-if="error" class="tdialog__state tdialog__state--error" role="alert">{{ error }}</p>

    <div v-else class="tdialog__body">
      <section class="summary" aria-labelledby="summary-title">
        <header>
          <h3 id="summary-title">Resumo</h3>
          <BaseButton
            v-if="canManage && segments.length"
            variant="secondary"
            :loading="summarizing"
            :disabled="!available"
            :title="available ? '' : 'O resumo por IA não está configurado neste servidor.'"
            @click="summarize"
          >
            <Sparkles :size="16" aria-hidden="true" />
            {{ summary ? 'Gerar de novo' : 'Gerar resumo' }}
          </BaseButton>
        </header>
        <p v-if="summaryError" class="tdialog__state tdialog__state--error" role="alert">
          {{ summaryError }}
        </p>
        <div v-if="blocks.length" class="summary__text">
          <template v-for="(block, index) in blocks" :key="index">
            <h4 v-if="block.type === 'heading'">{{ block.text }}</h4>
            <p v-else-if="block.type === 'item'" class="summary__item">{{ block.text }}</p>
            <p v-else>{{ block.text }}</p>
          </template>
        </div>
        <p v-else class="tdialog__muted">
          <template v-if="!segments.length">Sem falas para resumir.</template>
          <template v-else-if="!available"
            >O resumo por IA não está configurado neste servidor (chave de API ausente).</template
          >
          <template v-else-if="canManage">Ainda não há resumo. Use “Gerar resumo”.</template>
          <template v-else>Ainda não há resumo desta reunião.</template>
        </p>
      </section>

      <section class="transcript" aria-labelledby="transcript-title">
        <h3 id="transcript-title">Transcrição</h3>
        <TranscriptList
          :segments="segments"
          empty-text="Esta reunião não teve falas transcritas."
        />
      </section>
    </div>

    <footer class="tdialog__footer">
      <BaseButton variant="secondary" :disabled="!segments.length" @click="download('txt')">
        <Download :size="16" aria-hidden="true" /> Baixar .txt
      </BaseButton>
      <BaseButton variant="secondary" :disabled="!segments.length" @click="download('md')">
        <Download :size="16" aria-hidden="true" /> Baixar .md
      </BaseButton>
    </footer>
  </dialog>
</template>

<style scoped>
.tdialog {
  margin: auto;
  width: min(44rem, calc(100% - 2rem));
  max-height: calc(100dvh - 2rem);
  padding: 0;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
}

.tdialog[open] {
  display: flex;
  flex-direction: column;
}

.tdialog::backdrop {
  background: color-mix(in srgb, var(--color-text) 45%, transparent);
}

.tdialog__header,
.tdialog__footer {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
}

.tdialog__header {
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border);
}

.tdialog__header h2 {
  font-size: var(--font-size-lg);
  overflow-wrap: anywhere;
}

.tdialog__close {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  margin-right: calc(var(--space-3) * -1);
  color: var(--color-text-secondary);
  border-radius: 50%;
  touch-action: manipulation;
}

.tdialog__footer {
  justify-content: flex-end;
  border-top: 1px solid var(--color-border);
}

.tdialog__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-4);
  min-height: 0;
  padding: var(--space-4) var(--space-5);
  overflow-y: auto;
}

.tdialog__state,
.tdialog__muted {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.tdialog__state {
  padding: var(--space-5);
}

.tdialog__state--error {
  color: var(--color-danger);
}

.summary,
.transcript {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.summary > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-2);
}

h3 {
  font-size: var(--font-size-md);
}

.summary__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.summary__text h4 {
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
}

.summary__item {
  position: relative;
  padding-left: var(--space-4);
}

.summary__item::before {
  position: absolute;
  left: var(--space-1);
  content: '•';
}

@media (max-width: 600px) {
  .tdialog {
    width: calc(100% - 1rem);
    max-height: calc(100dvh - 1rem);
  }

  .tdialog__header,
  .tdialog__footer,
  .tdialog__body {
    padding-inline: var(--space-4);
  }

  .tdialog__footer {
    padding-bottom: max(var(--space-4), env(safe-area-inset-bottom));
  }
}

.transcript :deep(.tlist) {
  padding: var(--space-3) 0;
  overflow: visible;
}
</style>
