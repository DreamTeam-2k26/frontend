<script setup>
import { computed, nextTick, reactive, ref, useId } from 'vue'
import { Pencil, Send, Trash2 } from 'lucide-vue-next'
import ActionMenu from '@/components/ui/ActionMenu.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import { useAuthStore } from '@/stores/auth'
import { useKanbanStore } from '@/stores/kanban'
import { useTaskDetailStore } from '@/stores/taskDetail'
import { canDeleteComment, canEditComment, timeAgo } from '@/utils/kanban'

const BODY_MAX = 5000
const COUNTER_FROM = 4500

// Seção do modal de detalhe: comentários da tarefa aberta, identificados por autor.
const auth = useAuthStore()
const kanban = useKanbanStore()
const detail = useTaskDetailStore()

const ids = { title: useId(), field: useId() }
const body = ref('')
const sending = ref(false)
const error = ref('')
const editing = reactive({ id: null, body: '', busy: false, error: '' })
const editInput = ref(null)
const removing = reactive({ comment: null, busy: false })

const userId = computed(() => auth.user?.id ?? null)
const now = new Date()
const ordered = computed(() =>
  [...detail.comments].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id),
)

const tooLong = (text) => text.length > BODY_MAX
const edited = (comment) => new Date(comment.updated_at) - new Date(comment.created_at) > 1000

function menuItems(comment) {
  return [
    canEditComment(comment, userId.value) && { id: 'edit', label: 'Editar', icon: Pencil },
    canDeleteComment(comment, userId.value, kanban.role) && {
      id: 'delete',
      label: 'Excluir comentário',
      icon: Trash2,
      danger: true,
    },
  ].filter(Boolean)
}

// Enter envia; Shift+Enter quebra a linha. Em erro, o texto continua no campo.
async function send() {
  const text = body.value.trim()
  error.value = !text ? 'Escreva um comentário.' : tooLong(text) ? 'Comentário muito longo.' : ''
  if (error.value || sending.value) return
  sending.value = true
  try {
    await detail.addComment(text)
    body.value = ''
  } catch {
    // Toast exibido pela store.
  } finally {
    sending.value = false
  }
}

async function startEdit(comment) {
  Object.assign(editing, { id: comment.id, body: comment.body, busy: false, error: '' })
  await nextTick()
  editInput.value?.[0]?.focus()
}

async function saveEdit(comment) {
  const text = editing.body.trim()
  editing.error = !text ? 'Escreva um comentário.' : tooLong(text) ? 'Comentário muito longo.' : ''
  if (editing.error) return
  if (text === comment.body) {
    editing.id = null
    return
  }
  editing.busy = true
  try {
    await detail.editComment(comment, text)
    editing.id = null
  } catch {
    // Mantém a edição aberta com o texto digitado.
  } finally {
    editing.busy = false
  }
}

async function confirmRemove() {
  removing.busy = true
  try {
    await detail.removeComment(removing.comment)
  } catch {
    // Toast exibido pela store.
  } finally {
    Object.assign(removing, { comment: null, busy: false })
  }
}

function onMenu(comment, action) {
  if (action === 'edit') startEdit(comment)
  else if (action === 'delete') removing.comment = comment
}
</script>

<template>
  <section class="comments" :aria-labelledby="ids.title">
    <h3 :id="ids.title" class="comments__title">
      Comentários <span class="comments__count">({{ detail.comments.length }})</span>
    </h3>

    <form class="comments__composer" novalidate @submit.prevent="send">
      <UserAvatar
        :name="auth.user?.name || ''"
        :src="auth.user?.profile_picture?.url || ''"
        size="sm"
      />
      <div class="comments__field">
        <label :for="ids.field" class="visually-hidden">Escreva um comentário</label>
        <textarea
          :id="ids.field"
          v-model="body"
          class="comments__input"
          rows="2"
          placeholder="Escreva um comentário… (Enter envia, Shift+Enter quebra linha)"
          :disabled="sending"
          :aria-invalid="Boolean(error)"
          :aria-describedby="error ? `${ids.field}-error` : undefined"
          @keydown.enter.exact.prevent="send"
        />
        <div class="comments__field-footer">
          <small v-if="error" :id="`${ids.field}-error`" class="comments__error">{{ error }}</small>
          <small
            v-if="body.length >= COUNTER_FROM"
            class="comments__counter"
            :class="{ 'comments__counter--over': tooLong(body) }"
          >
            {{ body.length }}/{{ BODY_MAX }}
          </small>
          <BaseButton type="submit" :loading="sending" :disabled="!body.trim()">
            <Send :size="16" aria-hidden="true" /> Enviar
          </BaseButton>
        </div>
      </div>
    </form>

    <p v-if="!ordered.length" class="comments__empty">Nenhum comentário ainda.</p>
    <ul v-else class="comments__list">
      <li v-for="comment in ordered" :key="comment.id" class="comments__item">
        <UserAvatar
          :name="comment.author_name || ''"
          :src="comment.author_profile_picture || ''"
          size="sm"
        />
        <div class="comments__content">
          <div class="comments__meta">
            <strong class="comments__author">{{
              comment.author_name || 'Usuário removido'
            }}</strong>
            <time
              :datetime="comment.created_at"
              :title="new Date(comment.created_at).toLocaleString('pt-BR')"
            >
              {{ timeAgo(comment.created_at, now) }}
            </time>
            <span v-if="edited(comment)" class="comments__edited">(editado)</span>
            <ActionMenu
              v-if="menuItems(comment).length"
              class="comments__menu"
              :label="`Ações do comentário de ${comment.author_name || 'usuário removido'}`"
              :items="menuItems(comment)"
              @select="onMenu(comment, $event)"
            />
          </div>

          <form
            v-if="editing.id === comment.id"
            class="comments__edit"
            novalidate
            @submit.prevent="saveEdit(comment)"
          >
            <label :for="`${ids.field}-edit-${comment.id}`" class="visually-hidden">
              Editar comentário
            </label>
            <textarea
              :id="`${ids.field}-edit-${comment.id}`"
              ref="editInput"
              v-model="editing.body"
              class="comments__input"
              rows="3"
              :disabled="editing.busy"
              :aria-invalid="Boolean(editing.error)"
              @keydown.enter.exact.prevent="saveEdit(comment)"
              @keydown.esc.stop.prevent="editing.id = null"
            />
            <small v-if="editing.error" class="comments__error">{{ editing.error }}</small>
            <div class="comments__edit-actions">
              <BaseButton variant="ghost" :disabled="editing.busy" @click="editing.id = null">
                Cancelar
              </BaseButton>
              <BaseButton type="submit" :loading="editing.busy">Salvar</BaseButton>
            </div>
          </form>
          <p v-else class="comments__body">{{ comment.body }}</p>
        </div>
      </li>
    </ul>

    <ConfirmDialog
      v-if="removing.comment"
      title="Excluir comentário"
      message="Excluir este comentário? Esta ação não pode ser desfeita."
      confirm-label="Excluir comentário"
      :busy="removing.busy"
      @confirm="confirmRemove"
      @cancel="removing.comment = null"
    />
  </section>
</template>

<style scoped>
.comments {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.comments__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.comments__count {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-regular);
}
.comments__composer,
.comments__item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}
.comments__field,
.comments__content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}
.comments__input {
  padding: var(--space-2) var(--space-3);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
}
.comments__input[aria-invalid='true'] {
  border-color: var(--color-danger);
}
.comments__field-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
}
.comments__error {
  margin-right: auto;
  color: var(--color-danger);
  font-size: var(--font-size-xs);
}
.comments__counter {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.comments__counter--over {
  color: var(--color-danger);
  font-weight: var(--font-weight-semibold);
}
.comments__empty {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.comments__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.comments__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1) var(--space-2);
  min-height: 2.25rem;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.comments__author {
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.comments__menu {
  margin-left: auto;
}
/* Texto do usuário só por interpolação, preservando quebras de linha. */
.comments__body {
  color: var(--color-text);
  font-size: var(--font-size-sm);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.comments__edit {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.comments__edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>
