import api from './api'

// Discussões do Brainstorm (backend Feat-52). Paginação padrão: { results, count, total_pages }.
export function listTopics(
  { project, search, category, status, ordering, page, pageSize },
  { signal } = {},
) {
  return api.get('/brainstorm-topics/', {
    params: {
      project,
      search: search || undefined,
      category: category || undefined,
      status: status || undefined,
      ordering: ordering || undefined,
      page,
      page_size: pageSize,
    },
    signal,
  })
}

export function getTopic(id, { signal } = {}) {
  return api.get(`/brainstorm-topics/${id}/`, { signal })
}

export function createTopic({ project, title, category, context, initialSuggestion }) {
  return api.post('/brainstorm-topics/', {
    project,
    title,
    category,
    context,
    initial_suggestion: initialSuggestion,
  })
}

export function updateTopic(id, { title, category, context, initialSuggestion }) {
  return api.patch(`/brainstorm-topics/${id}/`, {
    title,
    category,
    context,
    initial_suggestion: initialSuggestion,
  })
}

export function deleteTopic(id) {
  return api.delete(`/brainstorm-topics/${id}/`)
}

// value: 1, -1 ou 0 (remove). Responde { score, upvotes, downvotes, my_vote }.
export function voteTopic(id, value) {
  return api.post(`/brainstorm-topics/${id}/vote/`, { value })
}

export function closeTopic(id) {
  return api.post(`/brainstorm-topics/${id}/close/`)
}

export function reopenTopic(id) {
  return api.post(`/brainstorm-topics/${id}/reopen/`)
}

export function archiveTopic(id) {
  return api.post(`/brainstorm-topics/${id}/archive/`)
}

// Síntese da IA na hora: pode levar até ~2 minutos (modelos gratuitos com reserva).
export function analyzeTopic(id) {
  return api.post(`/brainstorm-topics/${id}/analyze/`, null, { timeout: 180_000 })
}

export function getTopicAnalysis(id, { signal } = {}) {
  return api.get(`/brainstorm-topics/${id}/analysis/`, { signal })
}

export function listTopicVersions(id, { signal } = {}) {
  return api.get(`/brainstorm-topics/${id}/versions/`, { signal })
}

// body montado por approvalPayload (utils/brainstorm.js): { analysis, text, justification, tasks }.
export function approveTopic(id, { analysis, text, justification, tasks }) {
  return api.post(`/brainstorm-topics/${id}/approve/`, { analysis, text, justification, tasks })
}
