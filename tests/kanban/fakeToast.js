// Registra os toasts em vez de desenhar (os testes conferem as mensagens).
export const toasts = []

const push = (type) => (message) => {
  toasts.push({ type, message })
  return toasts.length
}

export const toast = Object.assign(push('default'), {
  success: push('success'),
  error: push('error'),
  warning: push('warning'),
  info: push('info'),
  loading: push('loading'),
  update: () => {},
  remove: () => {},
})
