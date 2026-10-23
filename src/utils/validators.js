// Cada regra recebe (valor, todosOsValores) e retorna mensagem de erro ou ''.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const required =
  (message = 'Campo obrigatório.') =>
  (value) =>
    String(value ?? '').trim() ? '' : message

export const email =
  (message = 'Informe um e-mail válido.') =>
  (value) =>
    !value || EMAIL_PATTERN.test(value) ? '' : message

export const minLength =
  (length, message = `Use pelo menos ${length} caracteres.`) =>
  (value) =>
    !value || value.length >= length ? '' : message

export const sameAs =
  (field, message = 'Os valores não conferem.') =>
  (value, values) =>
    value === values[field] ? '' : message
