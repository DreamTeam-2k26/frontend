# Autenticação Google — issue #35

## Configuração

Copie as variáveis ausentes de `.env.example` para o `.env` local, preservando a URL e as chaves de sessão já usadas no ambiente. Preencha `VITE_GOOGLE_CLIENT_ID` com o Client ID público OAuth 2.0 do tipo **Web**. O Django deve usar esse mesmo valor em `GOOGLE_CLIENT_ID`. Reinicie o Vite após editar o `.env`.

No Google Cloud, configure as origens JavaScript autorizadas com a origem exata do frontend (protocolo, domínio e porta; por exemplo `http://localhost:5173` em desenvolvimento e a origem HTTPS da aplicação publicada). Configure a tela de consentimento, links reais de termos/privacidade e usuários de teste se o aplicativo estiver em teste. Não coloque `client_secret`, chaves privadas ou tokens em variáveis `VITE_*`.

O GIS carrega somente de `https://accounts.google.com/gsi/client`, inicializa uma vez e renderiza o botão oficial em Login, Cadastro e Perfil. Cada botão tem `state` próprio; callbacks antigos são descartados. O frontend envia exclusivamente `{ credential }` ao Django. A credencial fica em memória durante o envio e não é decodificada, persistida ou registrada pelo código. Apenas os JWTs Fluxo usam os helpers de sessão existentes. Em produção o envio exige HTTPS; HTTP é permitido somente para API loopback em desenvolvimento.

Referência: https://developers.google.com/identity/gsi/web/reference/js-reference

## Contrato do backend #39

- `POST /api/auth/google/`: `{ credential }` → `{ access, refresh }`. Criação e retorno usam a mesma mensagem “Bem-vindo!”, pois o contrato não distingue conta nova de existente.
- `GET /api/users/me/`: perfil real após receber os JWTs.
- `GET /api/auth/google/link/`: `{ linked, email }`, com JWT Fluxo; consultado no Perfil.
- `POST /api/auth/google/link/`: `{ credential }`, com JWT Fluxo → `{ linked, email }`.
- `account_link_required`: orienta entrar com senha e vincular no Perfil. Os links entre Login/Cadastro preservam `redirect` de convite.
- `invalid_google_token`, `google_email_not_verified`, `inactive_account`, `google_account_in_use`, `already_linked`, `google_unavailable` e `google_auth_unavailable`: mensagens locais sem reproduzir detalhes arbitrários da API.
- Um 401 no login Google não dispara refresh/logout. Erros no endpoint de vínculo preservam a sessão local; se o JWT estiver expirado, a interface orienta conferir a sessão e entrar novamente se necessário. Os outros endpoints mantêm o refresh existente.
- A UI bloqueia operações durante o POST (timeout de 20s). A espera de popup não bloqueia os formulários: cancelar/fechar/bloquear popup permite tentar novamente pelo botão oficial. Não há One Tap automático nem botão de desvincular.

## Testes automatizados

`npm run test:google` usa GIS simulado e transporte Axios simulado, exercitando o serviço, a store Pinia e os interceptors reais: callback exclusivo do botão, inicialização única, descarte após desmontagem, falha de script e retentativa, retorno de JWTs, busca do perfil, requisições duplicadas, erros 400/401/403/409/503/rede, vínculo com JWT e preservação da sessão, credenciais incompletas, logout durante POST, refresh JWT em endpoint privado, senha/cadastro convencionais e validação de retorno interno de convite.

## Checks executados

- `npm run test:google`: 12 cenários passaram.
- `npx eslint .` e `npx oxlint .`: passaram.
- `npm run build` e `git diff --check`: passaram.
- Regressão: `test:members`, `test:dashboard`, `test:projects`, `test:folders`, `test:chat` e `test:calls` passaram.

## Validação real pendente

Neste ambiente `VITE_GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_ID` não estavam configurados. O Vite não pôde abrir porta (`listen EPERM 127.0.0.1:5185`), e o Chrome encerrou ao iniciar (`setsockopt: Operation not permitted`, SIGTRAP). Portanto **não há comprovação de login Google real nem capturas de navegador**. Testes com mocks não validam Google Cloud, popup, CORS, cookies, origem autorizada ou a verificação criptográfica no Django.

Antes de considerar a issue concluída e mover para In Review, executar com backend #39 implantado/configurado:

- [ ] Login e Cadastro: conta Google nova e retorno à mesma conta, perfil/nome reais na Home e Sidebar.
- [ ] Conta Fluxo de mesmo e-mail sem vínculo: orientação, login por senha, vínculo no Perfil e mensagem “Conta Google vinculada”. Recarregar Perfil e verificar estado persistido.
- [ ] Sair e entrar com a conta Google vinculada; conferir também login por senha.
- [ ] Recusar vínculo com Google de outro usuário ou segundo vínculo incompatível sem apagar a sessão.
- [ ] JWT expirado: renovação em navegação privada; testar mensagem de sessão no vínculo.
- [ ] Navegador deslogado abrindo convite: Login, alternar Cadastro/Login, Google e retorno ao mesmo convite.
- [ ] Popup cancelado/bloqueado, script bloqueado, rede interrompida, backend indisponível, conta inativa e credencial inválida; retentativa sem duplicar POST.
- [ ] Teclado/foco, mobile, desktop, temas Light/Dark e redimensionamento.
- [ ] Anexar capturas reais de Login/Cadastro e comprovação do fluxo completo à PR.

A implementação frontend pode ser revisada, mas a issue não deve ser fechada antes dessa validação ponta a ponta.

## Foto Google — atualização do backend `806ee5e`

O backend passou a importar a foto Google no login e no vínculo, devolvendo o resultado no campo existente `profile_picture.url`. A store recarrega o perfil também depois do vínculo, atualizando os avatares sem exigir F5. Se essa leitura falhar após um vínculo bem-sucedido, o vínculo continua confirmado e a interface orienta recarregar o Perfil.

A suíte `core.tests.test_google_auth_picture` passou com 14 testes em banco descartável; downloads Google são simulados nessa suíte. A migração `0016_google_identity_picture` já estava aplicada no banco local. O Client ID foi configurado posteriormente nos `.env` locais do frontend e backend. Ainda é necessário novo login Google real para importar a foto de uma conta que já estava vinculada antes da atualização. Não houve uso da sessão Google real do usuário pelo agente.
