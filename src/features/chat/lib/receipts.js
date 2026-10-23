// Status de entrega/leitura das mensagens e contagem de pessoas online.
// - 'sent'      ✓   enviada, mas algum participante ainda não a recebeu
// - 'delivered' ✓✓  todos já a receberam (estavam online ou entraram depois do envio), mas nem todos leram
// - 'read'      ✓✓  (verdes) todos leram (campo `read`, calculado pelo servidor)

function liveStatus(member, presence) {
  const live = presence?.[member.user.id]

  return {
    online: live ? Boolean(live.online) : Boolean(member.online),
    lastSeen: live ? live.last_seen : member.last_seen,
  }
}

export function messageStatus(message, { members = [], presence = {}, authorId = null } = {}) {
  if (message?.read) return 'read'

  const created = new Date(message?.created).getTime()
  const others = members.filter((member) => member.user.id !== authorId)

  // Sem lista de membros ainda: não dá para afirmar que chegou.
  if (!others.length || Number.isNaN(created)) return 'sent'

  const delivered = others.every((member) => {
    const { online, lastSeen } = liveStatus(member, presence)

    if (online) return true

    return Boolean(lastSeen) && new Date(lastSeen).getTime() >= created
  })

  return delivered ? 'delivered' : 'sent'
}

export function onlineCount(members = [], presence = {}) {
  return members.filter((member) => liveStatus(member, presence).online).length
}
