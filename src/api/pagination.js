// O backend pagina em até 100 itens ({ results, total_pages, count }). Carrega todas as páginas:
// quadro, contagens e filtros precisam do conjunto completo.
export async function loadAllPages(fetchPage) {
  const first = await fetchPage(1)
  if (Array.isArray(first)) return first

  const items = [...first.results]
  for (let page = 2; page <= first.total_pages; page += 1) {
    const data = await fetchPage(page)
    items.push(...data.results)
  }
  return items
}

export const PAGE_SIZE = 100
