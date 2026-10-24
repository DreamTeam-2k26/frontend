<script setup>
import { computed } from 'vue'
import { Download } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import { SPEECH } from '../lib/speechRecognizer'
import { saveTextFile } from '../lib/download'
import { downloadName, toDocument } from '../lib/transcript'
import TranscriptList from './TranscriptList.vue'

// Painel da transcrição dentro da chamada: liga/desliga (dono/admin), situação da minha fala e lista ao vivo.
const props = defineProps({
  call: { type: Object, required: true },
  transcription: { type: Object, required: true }, // retorno (reativo) de useTranscription
  segments: { type: Array, default: () => [] },
  micOn: Boolean,
  canManage: Boolean,
})

const own = computed(() => {
  const { enabled, supported, status } = props.transcription

  if (!enabled) return ''
  if (!supported || status === SPEECH.UNSUPPORTED) {
    return 'Este navegador não transcreve a sua voz (use o Chrome ou o Edge). Você continua vendo a fala dos outros.'
  }
  if (status === SPEECH.DENIED)
    return 'A permissão do microfone foi negada: sua fala não está sendo transcrita.'
  if (status === SPEECH.ERROR)
    return 'Não foi possível transcrever a sua voz agora. Recarregue a página para tentar de novo.'
  if (!props.micOn) return 'Seu microfone está desligado: sua fala não está sendo transcrita.'

  return props.transcription.listening ? 'Ouvindo você…' : 'Preparando o reconhecimento de voz…'
})

function download(format) {
  const text = toDocument(props.call, props.segments, { format })

  saveTextFile(
    downloadName(props.call, format),
    text,
    format === 'md' ? 'text/markdown' : 'text/plain',
  )
}
</script>

<template>
  <div class="tpanel">
    <div class="tpanel__status" :class="{ 'tpanel__status--on': transcription.enabled }">
      <p role="status">
        <span class="tpanel__dot" aria-hidden="true" />
        {{ transcription.enabled ? 'Transcrição ligada' : 'Transcrição desligada' }}
      </p>
      <BaseButton
        v-if="canManage"
        :variant="transcription.enabled ? 'secondary' : 'primary'"
        :loading="transcription.busy"
        @click="transcription.toggle()"
      >
        {{ transcription.enabled ? 'Desligar' : 'Ligar transcrição' }}
      </BaseButton>
      <p v-else-if="!transcription.enabled" class="tpanel__hint">
        O dono ou um administrador pode ligar.
      </p>
    </div>

    <p v-if="transcription.problem" class="tpanel__alert" role="alert">
      {{ transcription.problem }}
    </p>
    <p v-if="own" class="tpanel__own" role="status">{{ own }}</p>

    <TranscriptList
      follow
      :segments="segments"
      :interim="transcription.interim"
      :empty-text="
        transcription.enabled
          ? 'Comece a falar: as falas aparecem aqui, separadas por pessoa.'
          : 'Quando a transcrição for ligada, as falas aparecem aqui.'
      "
    />

    <footer class="tpanel__footer">
      <BaseButton variant="secondary" :disabled="!segments.length" @click="download('txt')">
        <Download :size="16" aria-hidden="true" /> .txt
      </BaseButton>
      <BaseButton variant="secondary" :disabled="!segments.length" @click="download('md')">
        <Download :size="16" aria-hidden="true" /> .md
      </BaseButton>
    </footer>
  </div>
</template>

<style scoped>
.tpanel {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.tpanel__status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}

.tpanel__status p {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: var(--font-weight-medium);
}

.tpanel__dot {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 50%;
  background: var(--color-text-secondary);
}

.tpanel__status--on .tpanel__dot {
  background: var(--color-danger);
  animation: tpanel-pulse 1.6s ease-in-out infinite;
}

.tpanel__hint {
  width: 100%;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: normal;
}

.tpanel__alert,
.tpanel__own {
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-xs);
}

.tpanel__alert {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

.tpanel__own {
  color: var(--color-text-secondary);
  background: var(--color-bg-subtle);
}

.tpanel__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
}

@keyframes tpanel-pulse {
  50% {
    opacity: 0.3;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tpanel__status--on .tpanel__dot {
    animation: none;
  }
}
</style>
