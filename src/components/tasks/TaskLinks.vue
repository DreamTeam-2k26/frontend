<script setup>
import { nextTick, reactive, ref, useId, useTemplateRef } from 'vue'
import { ExternalLink, Link2, Plus, Trash2 } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useForm } from '@/composables/useForm'
import { useTaskDetailStore } from '@/stores/taskDetail'
import { apiFieldErrors } from '@/utils/apiErrors'
import { isHttpUrl } from '@/utils/kanban'
import { required } from '@/utils/validators'

const TITLE_MAX = 150
const URL_MAX = 2048

// Seção do modal de detalhe: links de apoio da tarefa (anexos de arquivo ainda sem API).
const detail = useTaskDetailStore()

const ids = { title: useId() }
const form = useTemplateRef('form')
const adding = ref(false)
const saving = ref(false)
const serverErrors = ref({})
const removing = reactive({ link: null, busy: false })

const { values, errors, validateField, handleSubmit } = useForm(
  { title: '', url: '' },
  {
    title: [
      required('Informe um título.'),
      (value) => (value.trim().length > TITLE_MAX ? `Use no máximo ${TITLE_MAX} caracteres.` : ''),
    ],
    url: [
      required('Informe o endereço.'),
      (value) => (isHttpUrl(value) ? '' : 'Use um endereço começando com http:// ou https://.'),
    ],
  },
)

async function openForm() {
  adding.value = true
  await nextTick()
  form.value?.querySelector('input')?.focus()
}

function closeForm() {
  adding.value = false
  values.title = ''
  values.url = ''
  errors.title = ''
  errors.url = ''
  serverErrors.value = {}
}

const submit = handleSubmit(async (data) => {
  if (saving.value) return
  saving.value = true
  serverErrors.value = {}
  try {
    await detail.addLink({ title: data.title.trim(), url: data.url.trim() })
    closeForm()
  } catch (cause) {
    // Formulário continua com o que foi digitado.
    serverErrors.value = apiFieldErrors(cause, ['title', 'url'])
  } finally {
    saving.value = false
  }
})

function save() {
  submit()
  nextTick(() => form.value?.querySelector('[aria-invalid="true"]')?.focus())
}

async function confirmRemove() {
  removing.busy = true
  try {
    await detail.removeLink(removing.link)
  } catch {
    // Toast exibido pela store.
  } finally {
    Object.assign(removing, { link: null, busy: false })
  }
}

const host = (url) => {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
</script>

<template>
  <section class="links" :aria-labelledby="ids.title">
    <h3 :id="ids.title" class="links__title">
      Links de apoio <span class="links__count">({{ detail.links.length }})</span>
    </h3>

    <ul v-if="detail.links.length" class="links__list">
      <li v-for="link in detail.links" :key="link.id" class="links__item">
        <Link2 class="links__icon" :size="16" aria-hidden="true" />
        <a class="links__anchor" :href="link.url" target="_blank" rel="noopener noreferrer">
          <span class="links__name">{{ link.title }}</span>
          <span class="links__host">{{ host(link.url) }}</span>
          <ExternalLink :size="14" aria-hidden="true" />
          <span class="visually-hidden">(abre em nova aba)</span>
        </a>
        <button
          type="button"
          class="links__remove"
          :aria-label="`Excluir link ${link.title}`"
          @click="removing.link = link"
        >
          <Trash2 :size="16" aria-hidden="true" />
        </button>
      </li>
    </ul>
    <p v-else-if="!adding" class="links__empty">Nenhum link de apoio.</p>

    <form v-if="adding" ref="form" class="links__form" novalidate @submit.prevent="save">
      <BaseInput
        v-model="values.title"
        label="Título"
        name="title"
        :maxlength="TITLE_MAX"
        :disabled="saving"
        :error="errors.title || serverErrors.title || ''"
        @blur="validateField('title')"
      />
      <BaseInput
        v-model="values.url"
        label="Endereço (URL)"
        name="url"
        type="url"
        placeholder="https://"
        :maxlength="URL_MAX"
        :disabled="saving"
        :error="errors.url || serverErrors.url || ''"
        @blur="validateField('url')"
      />
      <div class="links__actions">
        <BaseButton variant="ghost" :disabled="saving" @click="closeForm">Cancelar</BaseButton>
        <BaseButton type="submit" :loading="saving">Adicionar link</BaseButton>
      </div>
    </form>
    <button v-else type="button" class="links__add" @click="openForm">
      <Plus :size="16" aria-hidden="true" /> Adicionar link
    </button>

    <ConfirmDialog
      v-if="removing.link"
      title="Excluir link"
      :message="`Excluir o link “${removing.link.title}”?`"
      confirm-label="Excluir link"
      :busy="removing.busy"
      @confirm="confirmRemove"
      @cancel="removing.link = null"
    />
  </section>
</template>

<style scoped>
.links {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.links__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.links__count {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-regular);
}
.links__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.links__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 2.75rem;
  padding: var(--space-1) var(--space-2) var(--space-1) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.links__icon {
  color: var(--color-text-secondary);
}
.links__anchor {
  display: inline-flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1) var(--space-2);
  min-width: 0;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
}
.links__anchor:hover .links__name {
  text-decoration: underline;
}
.links__name {
  font-weight: var(--font-weight-semibold);
  overflow-wrap: anywhere;
}
.links__host {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  overflow-wrap: anywhere;
}
.links__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
}
.links__remove:hover {
  color: var(--color-danger);
  background: var(--color-bg-hover);
}
.links__empty {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.links__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}
.links__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
.links__add {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: var(--space-2);
  min-height: 2.5rem;
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.links__add:hover {
  background: var(--color-bg-hover);
}
</style>
