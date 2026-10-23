export const roles = { owner: 'Dono', admin: 'Administrador', member: 'Membro' }
export const statuses = {
  pending: 'Pendente',
  accepted: 'Aceito',
  declined: 'Recusado',
  revoked: 'Revogado',
  expired: 'Expirado',
}
export const isManager = (role) => ['owner', 'admin'].includes(role)
export const canChangeRole = (actor, target) =>
  actor === 'owner' && ['admin', 'member'].includes(target)
export const canRemove = (actor, target) =>
  ['admin', 'member'].includes(target) &&
  (actor === 'owner' || (actor === 'admin' && target === 'member'))
export const filterMembers = (members, query) =>
  members.filter((member) =>
    `${member.user_name || ''} ${member.user_email || ''}`
      .toLocaleLowerCase('pt-BR')
      .includes(query.trim().toLocaleLowerCase('pt-BR')),
  )
export function inviteStatus(invite, now = Date.now()) {
  const status = invite.status || 'pending'
  return status === 'pending' && invite.expires_at && Date.parse(invite.expires_at) <= now
    ? 'expired'
    : status
}
export const usableLink = (invite, now) =>
  invite.kind === 'link' && !!invite.token && inviteStatus(invite, now) === 'pending'
export const inviteUrl = (
  token,
  origin = window.location.origin,
  base = import.meta.env.BASE_URL,
) => new URL(`${base.replace(/\/$/, '')}/invite/${encodeURIComponent(token)}`, origin).href
export const formatDate = (value) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : 'Não informada'
export function teamError(error) {
  const status = error?.response?.status
  if (status === 401) return 'Sua sessão expirou. Entre novamente para continuar.'
  if (status === 403)
    return 'Você não tem permissão para esta ação. As permissões podem ter mudado.'
  if (status === 404) return 'O recurso não existe ou não está disponível para sua conta.'
  if (status === 400) {
    const data = error.response.data
    // Só campos de validação: nunca serializa request/config ou o token do convite.
    const messages = Array.isArray(data)
      ? data
      : [
          'detail',
          'non_field_errors',
          'email',
          'invited_user',
          'role',
          'expires_at',
          'project',
          'token',
        ].flatMap((key) => data?.[key] || [])
    return (
      messages.filter((value) => typeof value === 'string').join(' ') ||
      'Confira os campos. O convite pode ter expirado ou você já participa do projeto.'
    )
  }
  return status >= 500
    ? 'O servidor não conseguiu concluir a operação. Tente novamente.'
    : 'Não foi possível conectar. Verifique sua conexão e tente novamente.'
}
