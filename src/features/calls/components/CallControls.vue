<script setup>
import {
  Captions,
  Hand,
  MessageSquare,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  PhoneOff,
  Settings,
  Users,
  Video,
  VideoOff,
} from 'lucide-vue-next'

defineProps({
  micOn: Boolean,
  cameraOn: Boolean,
  screenOn: Boolean,
  hand: Boolean,
  canShare: { type: Boolean, default: true },
  panel: { type: String, default: '' }, // '' | 'people' | 'chat' | 'transcript'
  transcribing: Boolean, // transcrição ligada: o botão mostra um aviso
  canEnd: Boolean,
})

defineEmits(['mic', 'camera', 'screen', 'hand', 'settings', 'panel', 'leave', 'end'])
</script>

<template>
  <div class="controls" role="toolbar" aria-label="Controles da chamada">
    <button
      type="button"
      class="control"
      :class="{ 'control--off': !micOn }"
      :aria-pressed="micOn"
      :title="micOn ? 'Desativar microfone' : 'Ativar microfone'"
      @click="$emit('mic')"
    >
      <component :is="micOn ? Mic : MicOff" :size="20" aria-hidden="true" />
      <span>{{ micOn ? 'Microfone' : 'Mudo' }}</span>
    </button>
    <button
      type="button"
      class="control"
      :class="{ 'control--off': !cameraOn }"
      :aria-pressed="cameraOn"
      :title="cameraOn ? 'Desativar câmera' : 'Ativar câmera'"
      @click="$emit('camera')"
    >
      <component :is="cameraOn ? Video : VideoOff" :size="20" aria-hidden="true" />
      <span>Câmera</span>
    </button>
    <button
      v-if="canShare"
      type="button"
      class="control"
      :class="{ 'control--active': screenOn }"
      :aria-pressed="screenOn"
      :title="screenOn ? 'Parar de compartilhar' : 'Compartilhar tela'"
      @click="$emit('screen')"
    >
      <component :is="screenOn ? MonitorOff : MonitorUp" :size="20" aria-hidden="true" />
      <span>{{ screenOn ? 'Parar' : 'Tela' }}</span>
    </button>
    <button
      type="button"
      class="control"
      :class="{ 'control--active': hand }"
      :aria-pressed="hand"
      :title="hand ? 'Baixar a mão' : 'Levantar a mão'"
      @click="$emit('hand')"
    >
      <Hand :size="20" aria-hidden="true" />
      <span>Mão</span>
    </button>
    <button type="button" class="control" title="Dispositivos" @click="$emit('settings')">
      <Settings :size="20" aria-hidden="true" />
      <span>Ajustes</span>
    </button>
    <button
      type="button"
      class="control"
      :class="{ 'control--active': panel === 'people' }"
      :aria-pressed="panel === 'people'"
      title="Participantes"
      @click="$emit('panel', 'people')"
    >
      <Users :size="20" aria-hidden="true" />
      <span>Pessoas</span>
    </button>
    <button
      type="button"
      class="control"
      :class="{ 'control--active': panel === 'chat' }"
      :aria-pressed="panel === 'chat'"
      title="Conversa do projeto"
      @click="$emit('panel', 'chat')"
    >
      <MessageSquare :size="20" aria-hidden="true" />
      <span>Conversa</span>
    </button>
    <button
      type="button"
      class="control"
      :class="{ 'control--active': panel === 'transcript', 'control--rec': transcribing }"
      :aria-pressed="panel === 'transcript'"
      :title="transcribing ? 'Transcrição ligada' : 'Transcrição'"
      @click="$emit('panel', 'transcript')"
    >
      <Captions :size="20" aria-hidden="true" />
      <span>Transcrição</span>
    </button>
    <button
      type="button"
      class="control control--leave"
      title="Sair da chamada"
      @click="$emit('leave')"
    >
      <PhoneOff :size="20" aria-hidden="true" />
      <span>Sair</span>
    </button>
    <button
      v-if="canEnd"
      type="button"
      class="control control--end"
      title="Encerrar a chamada para todos"
      @click="$emit('end')"
    >
      <span>Encerrar para todos</span>
    </button>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) max(var(--space-4), env(safe-area-inset-right))
    max(var(--space-3), env(safe-area-inset-bottom)) max(var(--space-4), env(safe-area-inset-left));
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-card);
}

.control {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.125rem;
  min-width: 4.25rem;
  min-height: 3.25rem;
  padding: var(--space-2) var(--space-3);
  color: var(--color-text);
  font-size: var(--font-size-xs);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  touch-action: manipulation;
  transition:
    background-color 0.15s ease,
    transform 0.15s ease;
}

.control:hover {
  background: var(--color-bg-hover);
}

.control:active {
  transform: scale(0.96);
}

.control--off {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

.control--active {
  color: var(--color-primary-hover);
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 16%, var(--color-bg-card));
}

.control--rec {
  position: relative;
}

.control--rec::after {
  position: absolute;
  top: 0.375rem;
  right: 0.375rem;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--color-danger);
  content: '';
}

.control--leave {
  color: #fff;
  border-color: var(--color-danger);
  background: var(--color-danger);
}

.control--leave:hover {
  background: color-mix(in srgb, var(--color-danger) 85%, #000);
}

.control--end {
  flex-direction: row;
  min-width: 0;
  color: var(--color-danger);
  background: transparent;
}

@media (max-width: 600px) {
  .control {
    min-width: 3.25rem;
    padding: var(--space-2);
  }

  .control span {
    display: none;
  }

  .control--end span {
    display: inline;
  }
}

/* Celular deitado: uma fileira só, sem rótulos (cada botão continua com 44 px ou mais). */
@media (max-height: 500px) {
  .controls {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-block: var(--space-2);
  }

  .control {
    flex-shrink: 0;
    min-width: 2.75rem;
    min-height: 2.75rem;
  }

  .control span {
    display: none;
  }

  .control--end span {
    display: inline;
  }
}
</style>
