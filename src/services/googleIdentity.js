// O GIS mantém uma configuração global. O callback pertence somente ao botão clicado.
let scriptPromise
let initialized = false
let active = null
let pending = false
let buttonId = 0

export function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    const timer = setTimeout(fail, 15000)
    function fail() {
      clearTimeout(timer)
      script.remove()
      scriptPromise = null
      reject(
        new Error(
          'Não foi possível carregar o Google. Verifique sua conexão ou bloqueadores e tente novamente.',
        ),
      )
    }
    script.onerror = fail
    script.onload = () => {
      clearTimeout(timer)
      if (!window.google?.accounts?.id) return fail()
      resolve(window.google.accounts.id)
    }
    document.head.append(script)
  })
  return scriptPromise
}

export async function mountGoogleButton(
  element,
  { clientId, theme, disabled, onCredential, isCurrent = () => true },
) {
  if (!clientId?.trim())
    throw new Error('Login Google não configurado. Use e-mail e senha ou informe o suporte.')
  const gis = await loadGoogleIdentity()
  if (!isCurrent()) return () => {}
  if (!initialized) {
    gis.initialize({
      client_id: clientId,
      auto_select: false,
      ux_mode: 'popup',
      callback: async (response) => {
        const owner = active
        if (!owner || response?.state !== owner.state || pending || owner.disabled()) return
        active = null
        pending = true
        try {
          await owner.onCredential(
            typeof response?.credential === 'string' ? response.credential : '',
          )
        } finally {
          pending = false
        }
      },
    })
    initialized = true
  }
  const owner = { disabled, onCredential, state: `fluxo-google-${++buttonId}` }
  gis.renderButton(element, {
    state: owner.state,
    type: 'standard',
    theme,
    size: 'large',
    text: 'continue_with',
    shape: 'rectangular',
    width: Math.min(400, Math.max(200, element.clientWidth || 300)),
    locale: 'pt-BR',
    click_listener: () => {
      if (!pending && !disabled()) active = owner
    },
  })
  return () => {
    if (active === owner) active = null
    element.replaceChildren()
  }
}
