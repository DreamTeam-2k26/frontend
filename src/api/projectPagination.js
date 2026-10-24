// O backend pagina em até 100 itens. Carrega a lista completa para a busca local.
export async function loadProjectPages(fetchPage) {
  const first = await fetchPage(1)
  if (Array.isArray(first)) return first
  const projects = [...first.results]
  for (let page = 2; page <= first.total_pages; page += 1) {
    const data = await fetchPage(page)
    projects.push(...data.results)
  }
  return projects
}
