// Regras e textos de participantes/convites do projeto (sem Vue, testáveis com node --test).

export const ROLE_LABELS = { owner: 'Dono', admin: 'Administrador', member: 'Membro' }

// Contas antigas ficaram com o nome padrão da migration ("Usuário"): mostra a parte local do e-mail.
export function personName(name, email) {
  const clean = (name ?? '').trim()

  if (clean && clean.toLowerCase() !== 'usuário') return clean

  return (email ?? '').split('@')[0] || 'Usuário'
}

export const roleLabel = (role) => ROLE_LABELS[role] ?? 'Participante'

/** Dono e administrador convidam, mudam a lista de convites e veem convites pendentes. */
export const canInvite = (role) => role === 'owner' || role === 'admin'

/** Só o dono troca papéis (e nunca o dele). */
export const canChangeRole = (myRole, target) => myRole === 'owner' && target.role !== 'owner'

/** Dono remove administradores e membros; administrador remove só membros; ninguém remove a si por aqui. */
export function canRemove(myRole, target, meId) {
  if (target.user === meId || target.role === 'owner') return false

  return myRole === 'owner' || (myRole === 'admin' && target.role === 'member')
}

/** Primeira mensagem útil de um erro da API (detail, non_field_errors ou erro de campo). */
export function apiMessage(error, fallback) {
  const data = error?.response?.data

  if (typeof data === 'string' && data.length < 200) return data
  if (data?.detail) return String(data.detail)

  if (data && typeof data === 'object') {
    for (const value of Object.values(data)) {
      const text = Array.isArray(value) ? value[0] : value

      if (typeof text === 'string') return text
    }
  }

  return fallback
}

/** Convida uma pessoa por vez e junta o resultado: uma falha não impede os outros convites. */
export async function inviteMany(projectId, users, send) {
  const sent = []
  const failed = []

  for (const user of users) {
    try {
      await send(projectId, user.id)
      sent.push(user)
    } catch (error) {
      failed.push({ user, message: apiMessage(error, 'Não foi possível enviar o convite.') })
    }
  }

  return { sent, failed }
}

export function inviteSummary({ sent, failed }) {
  const parts = []

  if (sent.length) {
    parts.push(
      sent.length === 1
        ? 'Convite enviado a 1 pessoa.'
        : `Convites enviados a ${sent.length} pessoas.`,
    )
  }

  if (failed.length) {
    parts.push(
      `Não foi possível convidar: ${failed.map(({ user, message }) => `${user.name} (${message})`).join('; ')}`,
    )
  }

  return parts.join(' ')
}
