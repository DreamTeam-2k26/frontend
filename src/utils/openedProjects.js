// Mantém apenas projetos realmente abertos pelo usuário nesta sessão.
// O item que acabou de ser visitado fica por último; o menu mostra até cinco.
export function rememberOpenedProject(opened, project, limit = 5) {
  const id = String(project?.id ?? '')
  const name = typeof project?.name === 'string' ? project.name.trim() : ''
  if (!/^[1-9]\d*$/.test(id) || !name) return opened
  return [
    ...opened.filter((item) => String(item.id) !== id),
    { id: Number(id), name },
  ].slice(-limit)
}
