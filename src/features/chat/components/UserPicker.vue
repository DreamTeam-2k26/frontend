<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { Search, X } from 'lucide-vue-next'
import { apiErrorMessage } from '../lib/errors'
import { searchUsers } from '../services/chatApi'
import ChatAvatar from './ChatAvatar.vue'

// Busca usuários por e-mail (mínimo de 2 caracteres, resposta sem e-mails) e mantém a seleção.
const selected = defineModel({ type: Array, default: () => [] })

const { excludeRoom = null, label = 'Adicionar participantes' } = defineProps({
  excludeRoom: { type: Number, default: null },
  label: { type: String, default: 'Adicionar participantes' },
})

const MIN_CHARS = 2
const term = ref('')
const results = ref([])
const loading = ref(false)
const error = ref('')
let timer = null
let requestId = 0

watch(term, (value) => {
  clearTimeout(timer)
  error.value = ''

  if (value.trim().length < MIN_CHARS) {
    results.value = []
    loading.value = false
    requestId += 1

    return
  }

  loading.value = true
  timer = setTimeout(() => search(value.trim()), 300)
})

onBeforeUnmount(() => clearTimeout(timer))

async function search(value) {
  const current = ++requestId

  try {
    const data = await searchUsers(value, excludeRoom)

    // Descarta respostas de buscas antigas que chegaram atrasadas.
    if (current === requestId) results.value = data.results ?? data
  } catch (err) {
    if (current === requestId)
      error.value = apiErrorMessage(err, 'Não foi possível buscar usuários.')
  } finally {
    if (current === requestId) loading.value = false
  }
}

const isSelected = (user) => selected.value.some((item) => item.id === user.id)

function add(user) {
  if (!isSelected(user)) selected.value = [...selected.value, user]

  term.value = ''
}

function remove(user) {
  selected.value = selected.value.filter((item) => item.id !== user.id)
}
</script>

<template>
  <div class="picker">
    <label class="picker__label" for="chat-user-search">{{ label }}</label>

    <ul v-if="selected.length" class="picker__chips" aria-label="Selecionados">
      <li v-for="user in selected" :key="user.id" class="picker__chip">
        <ChatAvatar :name="user.name" :src="user.avatar" :size="20" />
        <span>{{ user.name }}</span>
        <button type="button" :aria-label="`Remover ${user.name}`" @click="remove(user)">
          <X :size="14" aria-hidden="true" />
        </button>
      </li>
    </ul>

    <div class="picker__search">
      <Search :size="16" aria-hidden="true" class="picker__search-icon" />
      <input
        id="chat-user-search"
        v-model="term"
        type="search"
        autocomplete="off"
        placeholder="Buscar por e-mail (mín. 2 letras)"
      />
    </div>

    <p v-if="error" class="picker__hint picker__hint--error" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="picker__hint">Buscando...</p>
    <p v-else-if="term.trim().length >= MIN_CHARS && !results.length" class="picker__hint">
      Nenhum usuário encontrado.
    </p>

    <ul v-if="results.length" class="picker__results">
      <li v-for="user in results" :key="user.id">
        <button
          type="button"
          class="picker__result"
          :disabled="isSelected(user)"
          @click="add(user)"
        >
          <ChatAvatar :name="user.name" :src="user.avatar" :size="32" />
          <span>{{ user.name }}</span>
          <small v-if="isSelected(user)">adicionado</small>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.picker__label {
  font-size: 0.875rem;
  font-weight: 500;
}

.picker__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.picker__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.125rem 0.375rem 0.125rem 0.25rem;
  font-size: 0.8125rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background-color: var(--color-surface);
}

.picker__chip button {
  display: inline-flex;
  padding: 0.125rem;
  color: var(--color-text-secondary);
  border-radius: 50%;
}

.picker__chip button:hover {
  color: var(--color-danger);
}

.picker__search {
  position: relative;
}

.picker__search-icon {
  position: absolute;
  top: 50%;
  left: 0.75rem;
  color: var(--color-text-secondary);
  transform: translateY(-50%);
}

.picker__search input {
  padding: 0.625rem 0.75rem 0.625rem 2.25rem;
}

.picker__hint {
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
}

.picker__hint--error {
  color: var(--color-danger);
}

.picker__results {
  max-height: 12rem;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.picker__result {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.picker__result:hover:not(:disabled) {
  background-color: var(--color-surface);
}

.picker__result small {
  margin-left: auto;
  color: var(--color-text-secondary);
}
</style>
