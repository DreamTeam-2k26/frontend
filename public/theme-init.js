// Script síncrono no <head>: aplica o tema antes de carregar o CSS e montar o Vue.
;(() => {
  let savedTheme
  try {
    savedTheme = localStorage.getItem('fluxo-theme')
  } catch {
    // Storage bloqueado: abre no tema claro nesta visita.
  }

  // Primeiro acesso sempre no tema claro; o escuro só vale depois que o usuário escolher.
  const dark = savedTheme === 'dark'

  if (dark) {
    document.documentElement.dataset.theme = 'dark'
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
})()
