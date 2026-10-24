<script setup>
import { computed, nextTick, reactive, ref, useId, useTemplateRef } from 'vue'
import { Plus } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import SupportLinkDialog from '@/components/links/SupportLinkDialog.vue'
import SupportLinkList from '@/components/links/SupportLinkList.vue'
import { useForm } from '@/composables/useForm'
import { useKanbanStore } from '@/stores/kanban'
import { useTaskDetailStore } from '@/stores/taskDetail'
import { apiFieldErrors } from '@/utils/apiErrors'
import { TITLE_MAX, URL_MAX, linkFormErrors, linkRules } from '@/utils/supportLinks'

// Seção do modal de detalhe: links de apoio da tarefa (os gerais ficam na aba do projeto).
const detail = useTaskDetailStore()
const kanban = useKanbanStore()

const ids = { title: useId() }
const form = useTemplateRef('form')
const adding = ref(false)
const saving = ref(false)
const serverErrors = ref({})
const removing = reactive({ link: null, busy: false })
const editing = reactive({ link: null, saving: false, errors: {} })

// Só tarefas do projeto aberto: o backend recusa vínculo com tarefa de outro projeto.
const projectTasks = computed(() =>
  kanban.tasks.filter((task) => task.project === detail.task?.project),
)

const { values, errors, validateField, handleSubmit } = useForm({ title: '', url: '' }, linkRules)

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

function openEdit(link) {
  Object.assign(editing, { link, saving: false, errors: {} })
}

async function saveEdit(fields) {
  editing.saving = true
  editing.errors = {}
  try {
    await detail.updateLink(editing.link, fields)
    editing.link = null
  } catch (cause) {
    editing.errors = linkFormErrors(cause, 'Não foi possível salvar o link.')
  } finally {
    editing.saving = false
  }
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
</script>

<template>
  <section class="links" :aria-labelledby="ids.title">
    <header class="links__header">
      <h3 :id="ids.title" class="links__title">
        Links de apoio <span class="links__count">({{ detail.links.length }})</span>
      </h3>
      <button v-if="!adding" type="button" class="links__add" @click="openForm">
        <Plus :size="15" aria-hidden="true" /> Adicionar
      </button>
    </header>

    <SupportLinkList
      v-if="detail.links.length"
      class="links__list"
      :links="detail.links"
      @edit="openEdit"
      @remove="removing.link = $event"
    />
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

    <SupportLinkDialog
      v-if="editing.link"
      :link="editing.link"
      :tasks="projectTasks"
      :saving="editing.saving"
      :field-errors="editing.errors"
      @submit="saveEdit"
      @close="editing.link = null"
    />
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
.links__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.links__title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
}
.links__count {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-regular);
}
.links__add {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 2rem;
  padding: 0 var(--space-3);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}
.links__add:hover {
  border-color: var(--color-primary);
  background: var(--color-bg-hover);
}
.links__list {
  margin: 0 calc(-1 * var(--space-2));
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
</style>
