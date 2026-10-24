# #64 — Evidência de movimento

Capturas sequenciais montadas em PNG animado (APNG; abre animado no GitHub e nos navegadores).
Para caber várias etapas por animação, a gravação rodou com os tempos **8× mais lentos**
(mudança temporária, não versionada) e cada quadro é exibido por 110 ms; o último fica parado.
Tempos reais estão na tabela no fim. Conta de teste local e backend real (`localhost:8000`).

| Arquivo | Roteiro | O que mostra |
| --- | --- | --- |
| `01-primeira-visita.png` | Aba nova, sem marcador em `sessionStorage`, abrindo `/auth/login` | Fundo do tema sem flash; o símbolo surge, a máscara percorre as curvas do infinito, a seta entra, o recorte circular abre e revela o login. |
| `02-visita-curta.png` | Recarregar `/projects` na mesma aba, com sessão válida | Versão curta: logo já desenhada e fade; revela o destino privado (Meus projetos), sem forçar a Home. |
| `03-movimento-reduzido.png` | Primeira visita com movimento reduzido (simulado no JS*) abrindo `/auth/register` | Sem desenho nem recorte: a camada sai na hora e a página aparece. |
| `04-login.png` | Login por senha | Botão em carregamento enquanto a API responde; só depois do sucesso o recorte fecha sobre o login com a logo, a Home é montada por baixo e o recorte abre. |
| `05-logout.png` | Perfil → Sair da conta | O formulário sai antes da limpeza; o recorte fecha sobre o perfil, o login monta por baixo e o recorte abre. |
| `06-dialogo-saida.png` | Abrir "Novo projeto", digitar e cancelar (Esc) | Entrada com fade/escala; a saída mantém o conteúdo digitado até sumir e o foco volta ao botão. |

\* O seletor `prefers-reduced-motion` do sistema não pode ser alternado pela automação do navegador;
a gravação forçou o mesmo ramo do JavaScript (`prefersReducedMotion()` retornando `true`). No uso
real, a regra global de `main.css` também zera as durações de CSS.

## Tempos reais medidos (dev server)

| Fluxo | Medido | Meta da issue |
| --- | --- | --- |
| Primeira abertura | 1,19–1,20 s | 1,2–1,4 s |
| Visita curta | ~320 ms (≈160 ms de rota no dev + 160 ms de fade) | 150–250 ms |
| Entrada após login | 630 ms após a resposta da API | 450–650 ms |
| Logout | 601 ms | 600–800 ms |
| Saída de diálogo | ~200 ms | — |
