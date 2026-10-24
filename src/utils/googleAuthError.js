const messages = {
  account_link_required:
    'Já existe uma conta com este e-mail. Entre com e-mail e senha e use “Vincular Conta Google” no Perfil.',
  google_account_in_use: 'Esta conta Google já está vinculada a outro usuário do Fluxo.',
  already_linked: 'Sua conta Fluxo já está vinculada a outra conta Google.',
  invalid_google_token: 'Não foi possível validar a conta Google. Tente novamente.',
  google_email_not_verified: 'Verifique o e-mail da sua conta Google antes de continuar.',
  inactive_account: 'Esta conta está desativada. Entre em contato com o suporte.',
  google_unavailable: 'O Google está indisponível. Tente novamente em instantes.',
  google_auth_unavailable:
    'Login Google indisponível no servidor. Use e-mail e senha ou contate o suporte.',
}
export function googleAuthError(error, linking = false) {
  if (error?.code === 'google_insecure_transport')
    return 'A autenticação Google exige uma API HTTPS. Confira a configuração com o suporte.'
  const code = error?.response?.data?.code
  if (messages[code]) return messages[code]
  const status = error?.response?.status
  if (status === 401 && linking)
    return 'Não foi possível vincular. Confira sua sessão Fluxo e tente novamente; entre com senha se necessário.'
  if (status === 400 || status === 401)
    return 'Credencial Google inválida. Selecione sua conta novamente.'
  if (status === 403) return 'Esta conta não tem permissão para continuar.'
  if (status === 409)
    return 'Não foi possível vincular esta conta Google. Confira o vínculo no Perfil.'
  return 'Não foi possível concluir a operação. Verifique sua conexão e tente novamente.'
}
