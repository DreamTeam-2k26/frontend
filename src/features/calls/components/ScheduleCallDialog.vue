<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { todayISO } from '@/utils/kanban'
import BaseButton from '@/components/ui/BaseButton.vue'
import { fromLocalInput, toLocalInput } from '../lib/callRules'

// Formulário em janela: iniciar agora (só título), agendar ou editar uma reunião agendada.
const props = defineProps({
  mode: { type: String, default: 'schedule' }, // now | schedule | edit
  call: { type: Object, default: null },
  saving: Boolean,
  error: { type: String, default: '' },
})
const emit = defineEmits(['save', 'close'])

const dialog = ref(null)
const title = ref(props.call?.title ?? '')
const description = ref(props.call?.description ?? '')
const initialWhen = props.call?.scheduled_for
  ? toLocalInput(props.call.scheduled_for)
  : defaultWhen()
const date = ref(initialWhen.slice(0, 10))
const time = ref(initialWhen.slice(11, 16))
const when = computed(() => (date.value && time.value ? `${date.value}T${time.value}` : ''))
const today = todayISO()
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
const problem = ref('')

const withDate = computed(() => props.mode !== 'now')
const heading = computed(
  () =>
    ({ now: 'Iniciar reunião agora', schedule: 'Agendar reunião', edit: 'Editar reunião' })[
      props.mode
    ],
)
const submitLabel = computed(
  () => ({ now: 'Iniciar e entrar', schedule: 'Agendar', edit: 'Salvar' })[props.mode],
)

function defaultWhen() {
  const date = new Date(Date.now() + 60 * 60 * 1000)

  date.setMinutes(0, 0, 0)

  return toLocalInput(date)
}

function save() {
  if (props.saving) return
  problem.value = ''

  if (title.value.trim().length > 150) {
    problem.value = 'Use no máximo 150 caracteres no título.'

    return
  }

  const payload = { title: title.value.trim() }

  if (withDate.value) {
    const iso = fromLocalInput(when.value)

    if (!iso) {
      problem.value = 'Informe a data e a hora.'

      return
    }

    if (props.mode === 'schedule' && new Date(iso).getTime() < Date.now() - 60_000) {
      problem.value = 'Escolha uma data e hora no futuro.'

      return
    }

    payload.scheduled_for = iso
    payload.description = description.value.trim()
  }

  emit('save', payload)
}

onMounted(async () => {
  dialog.value.showModal()
  await nextTick()
  dialog.value.querySelector('input')?.focus()
})
</script>

<template>
  <dialog
    ref="dialog"
    class="call-form"
    aria-labelledby="call-form-title"
    @cancel.prevent="!saving && emit('close')"
  >
    <form novalidate :aria-busy="saving" @submit.prevent="save">
      <h2 id="call-form-title">{{ heading }}</h2>
      <p v-if="error || problem" class="error" role="alert">{{ problem || error }}</p>

      <div class="field">
        <label for="call-title">Título {{ mode === 'now' ? '(opcional)' : '' }}</label>
        <input
          id="call-title"
          v-model="title"
          maxlength="150"
          :disabled="saving"
          placeholder="Reunião do projeto"
          autocomplete="off"
        />
      </div>

      <template v-if="withDate">
        <div class="call-form__datetime">
          <BaseDatePicker
            v-model="date"
            label="Data da reunião"
            :min="mode === 'schedule' ? today : ''"
            :disabled="saving"
          />
          <BaseInput
            v-model="time"
            label="Horário"
            type="time"
            step="60"
            :disabled="saving"
            required
          />
        </div>
        <p class="call-form__hint">
          Horário local: {{ timezone }}. Depois de agendar, use “Adicionar ao Google Calendar” na
          reunião para confirmar o evento na sua agenda.
        </p>
        <div class="field">
          <label for="call-description">Descrição (opcional)</label>
          <textarea id="call-description" v-model="description" rows="3" :disabled="saving" />
        </div>
      </template>

      <div class="actions">
        <BaseButton variant="secondary" :disabled="saving" @click="emit('close')"
          >Cancelar</BaseButton
        >
        <BaseButton type="submit" :loading="saving">{{ submitLabel }}</BaseButton>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.call-form {
  margin: auto;
  width: min(30rem, calc(100% - 2rem));
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  padding: var(--space-6);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
}

.call-form::backdrop {
  background: color-mix(in srgb, var(--color-text) 45%, transparent);
}

form,
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.field {
  gap: var(--space-2);
}

label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

input,
textarea {
  padding: var(--space-3);
}

.call-form__datetime {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(7rem, 0.7fr);
  gap: var(--space-3);
}
.call-form__hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
@media (max-width: 399px) {
  .call-form__datetime {
    grid-template-columns: minmax(0, 1fr);
  }
}
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  overflow-wrap: anywhere;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-3);
}
</style>
