// Iniciais exibidas no avatar quando o usuário não tem foto ("Renan Lima" -> "RL").
export function getInitials(name) {
  return String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}
