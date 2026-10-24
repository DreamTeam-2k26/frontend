# Calendário de tarefas — issue #48

Branch `Feat-48` criada da `origin/dev` em `10192aa`, na pasta frontend existente.

## Uso e contrato

Acesso em `/projects/:id/calendar`, pelos links no Kanban e na seção Próximas entregas da Visão geral. O calendário usa os mesmos serviços de tarefas, colunas e participantes do Kanban. Todas as páginas são lidas pelo filtro `project`; respostas de outro projeto são rejeitadas. Não há backend novo nem operação de escrita no calendário.

O mês, dia selecionado e filtros ficam na URL (`month=YYYY-MM`, `day=YYYY-MM-DD`, `assignee` e `column`). As opções de responsável e status usam os mesmos campos/opções do Kanban. Tarefas sem prazo não aparecem; concluídas continuam aparecendo no prazo, sem indicador de atraso. Atraso compara datas locais e respeita coluna de categoria `done` e `completed_at`.

Desktop: mês com até três cards por dia, quantidade total e botão para acessar a lista completa. Mobile até 767px: grade compacta com quantidade e lista completa do dia selecionado abaixo. Os cards abrem `/projects/:id/kanban?task={id}`; a edição continua no detalhe existente. Navegar, selecionar datas e filtrar não altera prazos nem move tarefas. A agenda de reuniões/chamadas permanece independente.

Teclado: Tab acessa botões, filtros e links; setas mudam o dia (inclusive entre meses), Home/End mudam ao início/fim da semana. O botão de mais tarefas leva o foco ao título da lista completa. O dia atual e a seleção têm identificação textual/ARIA além da cor. Hoje volta ao mês/dia atual e conserva os filtros.

## Verificações automatizadas

- `npm run test:calendar`: regras de mês/ano, fevereiro bissexto, validação de data, filtros, atraso/conclusão, link do card, renderização dos cards/agenda, 107 tarefas paginadas nos serviços reais com transporte simulado, isolamento, troca rápida de projeto, erro/retry e descarte de lista parcial.
- A suíte foi executada com `TZ=America/Sao_Paulo` e `TZ=Pacific/Kiritimati` para conferir datas locais.
- Regressão: suites de Kanban, projetos, dashboard e membros; a fixture de rotas inclui o calendário. Os testes de stores usam a mesma importação externa de Pinia que as stores, evitando uma segunda instância criada pelo carregamento SSR de `pinia`.
- `npx eslint .`, `npx oxlint .`, `npm run build` e `git diff --check`.

## Navegador e capturas

`npm run test:calendar:browser` inicia Vite em 5188 e Google Chrome headless em 9338; requer `google-chrome` no PATH e `.env` com as chaves de sessão existentes. Usa HTTP simulado via CDP e JWT sintético, sem contas ou dados reais. Confere desktop/mobile, Light/Dark, foco por teclado, virada de ano, filtros, concluídas, links, erro/retry e ausência de escritas. As capturas são gravadas em `/tmp/fluxo48-screenshots`, ou no diretório `FLUXO_TEST_SCREENSHOTS`.

**Execução visual bloqueada neste ambiente:** o Vite recebeu `listen EPERM 127.0.0.1:5188`; a tentativa independente de Chrome encerrou com `setsockopt: Operation not permitted`/SIGTRAP. Não foram produzidas capturas nem alegada validação mobile real. Executar o teste de navegador fora dessa restrição e anexar desktop/mobile Light/Dark à PR antes de finalizar a issue.

Conferir também com backend real, em um projeto de teste:

- [ ] Acesso pela Visão geral e Kanban, URL direta, F5 e retorno ao detalhe da tarefa.
- [ ] Tarefas reais com e sem prazo; atrasadas, hoje, futuras e concluídas.
- [ ] Muitos itens no mesmo dia, filtros combinados e limpeza; dia e mês vazios.
- [ ] Janeiro/dezembro, fevereiro bissexto e navegação por teclado entre meses.
- [ ] Tela de 320/375px, desktop, nomes longos e ambos os temas sem rolagem horizontal.
- [ ] Troca rápida de projeto, falha de rede/retry, revogação de acesso e sessão expirada.
- [ ] Nenhum PATCH/POST/DELETE ao navegar ou filtrar; reuniões/chamadas preservadas.
