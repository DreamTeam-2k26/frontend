// Identidade da página para a transição do conteúdo no DefaultLayout. Nunca usa fullPath: a URL
// também guarda estado local (?aba=, pasta, ?task=, conversa) que não deve remontar a página.
// Só o projeto e a chamada definem uma página realmente nova.
export function pageKey(route) {
  const { id = '', callId = '' } = route.params ?? {}
  return [String(route.name ?? ''), id, callId].join(':')
}
