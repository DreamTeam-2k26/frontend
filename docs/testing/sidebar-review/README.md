# Revisão da logo compacta da sidebar — PR #51

O PNG de 914.790 bytes foi substituído por um SVG vetorial transparente de 914 bytes (redução de 99,9%). O SVG contém apenas paths e duas cores verdes, sem scripts, imagens embutidas, filtros ou recursos externos. O arquivo está enquadrado no símbolo, sem fundo texturizado.

O componente monta o símbolo no primeiro recolhimento e o mantém depois para preservar a transição ao expandir/recolher. `@starting-style` define o início da animação na primeira montagem. A imagem compacta usa `object-fit: contain`, sem blending, inversão ou grayscale. O tratamento existente da logo completa no tema escuro foi preservado.

## Validação

- Build, ESLint dos componentes de marca/sidebar e configuração, e `git diff --check`: passaram.
- Chrome headless via Playwright, Vite local, API simulada exclusivamente para carregar o layout com sessão de teste. Não valida autenticação ou backend real.
- Desktop 1280 × 800: sidebar expandida → recolhida → expandida nos temas claro e escuro.
- Confirmado que o símbolo não está montado antes do primeiro recolhimento, é carregado corretamente ao recolher e permanece montado ao expandir novamente.
- Confirmados `filter: none` e `mix-blend-mode: normal` na imagem compacta, nos dois temas.
- Mobile 390 × 844 com sidebar inicialmente expandida: logo completa visível no header e nenhuma imagem compacta montada, nos dois temas.
- As seis capturas abaixo foram inspecionadas para verificar enquadramento, fundo transparente e alinhamento. A parte verde escura do símbolo mantém a paleta em dark; não foi aplicada inversão de cores.

| Estado | Claro | Escuro |
| --- | --- | --- |
| Sidebar expandida | [Captura](sidebar-light-expanded.png) | [Captura](sidebar-dark-expanded.png) |
| Sidebar recolhida | [Captura](sidebar-light-collapsed.png) | [Captura](sidebar-dark-collapsed.png) |
| Header mobile | [Captura](sidebar-light-mobile.png) | [Captura](sidebar-dark-mobile.png) |
