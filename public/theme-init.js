// Script síncrono no <head>: aplica o tema antes de carregar o CSS e montar o Vue.
;(() => {
  let savedTheme
  try {
    savedTheme = localStorage.getItem('fluxo-theme')
  } catch {
    // Storage bloqueado: usa a preferência do sistema nesta visita.
  }

  const dark =
    savedTheme === 'dark' ||
    (savedTheme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  if (dark) {
    document.documentElement.dataset.theme = 'dark'
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
})()
