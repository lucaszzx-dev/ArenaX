# Roadmap de evolução do ArenaX

Última atualização: 3 de agosto de 2026.

O projeto evolui em versões pequenas. Cada entrega deve terminar com
migração, testes, lint, build, documentação, commit único e verificação do
deploy. O roadmap abaixo detalha o que ainda não foi implementado; o que já
existe está listado em `docs/PLANEJAMENTO.md` (Estado atual).

Nota: formato eliminatório/mata-mata/chaveamento já está implementado desde
o Ciclo 8 (geração segura do chaveamento, avanço automático, folgas e telas
pública/administrativa). Ele pode precisar de mais testes; extensões como
disputa de terceiro lugar e cabeças de chave ficaram para ciclos futuros
(ver `docs/MATA_MATA.md`).

## Visão geral da ordem recomendada

1. Locais e quadras (base simples, desbloqueia várias telas).
2. Regulamentos por campeonato (documento + validações básicas).
3. Permissões administrativas detalhadas + múltiplos organizadores.
4. Convites de jogadores (depende de permissões e inscrições).
5. Temporadas e ligas entre campeonatos.
6. Transferências entre clubes.
7. Rankings gerais entre campeonatos.
8. Árbitros.
9. Documentos e anexos.
10. Cobrança de inscrição.
11. PWA.
12. Internacionalização.

A ordem prioriza o valor por esforço e as dependências entre itens. Itens com
faturamento (cobrança) e escala (PWA/i18n) ficam por último porque dependem
de regras estáveis e de decisões de produto.

---

## 1. Convites de jogadores

**Descrição:** convidar jogadores por e-mail ou link para criar conta e se
vincular ao perfil de jogador/equipe; aprovar ou recusar solicitações de
inscrição em um campeonato.

**Dependências:**
- Permissões administrativas detalhadas (item 3) para controlar quem aprova.
- Fluxo de inscrição pública (hoje retirado do escopo; reabrir como parte
  deste item).
- E-mail transacional (provedor de e-mail) para convites e notificações.

**Impacto no schema:**
- `invitations` (destinatário, canal e-mail/link, token, expiração, status,
  championship_id, team_id/entry_id opcionais, criado por).
- Coluna `user_id` já existe em `team_members`/`championship_entries`
  (vinculo opcional) — aproveitar.
- Tabela de solicitações de inscrição (`entry_requests`) com status.

**Impacto no backend:**
- Serviço de convites com geração/validação de token único e expiração.
- Rotas de aceitar/recusar convite; validação de que o e-mail do convidado
  confere com a conta.
- Endpoints de solicitação/aprovação de inscrição pública.

**Impacto no frontend:**
- Telas: enviar convite, aceitar convite (link público), gerenciar
  solicitações pendentes no painel do organizador.
- Estados de convite expirado/aceito/recusado.

**Riscos:**
- Abuso de envio de e-mails (spam) — rate limit e confirmação de posse.
- Conta errada aceitando convite — validar e-mail e permitir revogação.
- Privacidade: e-mail de terceiros não pode vazar em rotas públicas.

**Complexidade estimada:** média-alta.

**Ordem recomendada:** 4º (após permissões e múltiplos organizadores).

**Decisões de arquitetura a tomar agora:**
- Provedor de e-mail (Resend/SendGrid/etc.) e fila para envio fora do
  request-response.
- Convite por link público vs. e-mail direcionado (ou ambos).
- O vínculo `user_id` deve ser único por jogador? (evitar conta duplicada).

## 2. Múltiplos organizadores por campeonato

**Descrição:** permitir que mais de um usuário administre o mesmo
campeonato, com papel e permissões definidos por vínculo.

**Dependências:**
- Permissões administrativas detalhadas (item 3) — os dois itens compartilham
  o mesmo modelo de papel.

**Impacto no schema:**
- Tabela `championship_members` (championship_id, user_id, role, criado por),
  com unicidade por campeonato+usuário.
- `championships.organizer_id` continua como proprietário; o vínculo
  adiciona co-organizadores.

**Impacto no backend:**
- `ChampionshipService.getMine()` hoje usa `organizer_id`; passa a considerar
  também `championship_members`.
- Novo serviço de membros: convidar, listar, alterar papel, remover.
- Toda checagem de autorização passa por uma função central
  (`getChampionshipRole(user, championship)`).

**Impacto no frontend:**
- Painel do organizador com seção "Membros".
- Exibição de papel na lista de campeonatos e restrições de UI por papel.

**Riscos:**
- Regressão no isolamento entre organizadores (testes de acesso cruzado
  precisam cobrir os novos papéis).
- Conflito de edição simultânea entre organizadores.

**Complexidade estimada:** média.

**Ordem recomendada:** junto com o item 3 (mesma base).

**Decisões de arquitetura a tomar agora:**
- Papéis fixos (OWNER, ADMIN, SCORER) vs. permissões granulares por ação.
- Quem pode convidar/remover outros membros (só o proprietário?).

## 3. Permissões administrativas detalhadas

**Descrição:** substituir o binário "proprietário ou não" por permissões por
ação (gerenciar participantes, editar partidas/placares, gerenciar clubes,
ver auditoria, etc.).

**Dependências:**
- Base atual de autorização já centraliza checagens por proprietário; extrair
  para um módulo de permissões.

**Impacto no schema:**
- Sem tabelas novas se usar papéis fixos; com permissões granulares,
  `championship_member_permissions` ou coluna `permissions jsonb`.
- Enum de papéis (`championship_role`).

**Impacto no backend:**
- Módulo `permissions` com `can(user, action, championship)`.
- Migrar todas as rotas administrativas para o novo módulo (hoje usam
  `getMine`/organizador).
- Testes de acesso cruzado e por papel para cada rota administrativa.

**Impacto no frontend:**
- Esconder/desabilitar ações sem permissão; mostrar papel atual.
- Componentes de administração recebem permissões do contexto do usuário.

**Riscos:**
- Esquecer uma rota na migração (auditoria de rotas obrigatória).
- Permissões muito granulares geram complexidade desnecessária no MVP.

**Complexidade estimada:** média-alta.

**Ordem recomendada:** 3º (base para convites e co-organizadores).

**Decisões de arquitetura a tomar agora:**
- Papéis fixos + regras por papel vs. permissões por ação. Recomendação:
  papéis fixos primeiro (OWNER/ADMIN/SCORER) e permissões só quando houver
  demanda real.
- Onde centralizar a checagem (decorator vs. helper em cada rota).

## 4. Temporadas e ligas entre campeonatos

**Descrição:** agrupar campeonatos em temporadas e ligas (ex.: "Liga
Municipal 2026" com várias arenas), com calendário e classificação por
temporada.

**Dependências:**
- Regras de pontos já existem por campeonato; definir como a classificação da
  liga combina resultados de arenas diferentes.
- Clubes reutilizáveis (já implementados) para que a mesma equipe participe
  de várias arenas.

**Impacto no schema:**
- `seasons` (nome, datas, status) e `leagues` (nome, esporte, visibilidade).
- `league_seasons`, `league_championships` (vínculo arena-temporada).
- Eventualmente `league_standings` materializada ou cálculo agregado.

**Impacto no backend:**
- Serviços de temporada/liga; criação e vínculo de arenas.
- Cálculo agregado de classificação da liga a partir dos resultados de cada
  arena participante.

**Impacto no frontend:**
- Página pública de liga/temporada com visão geral e classificação agregada.
- Painel para criar liga e vincular arenas.

**Riscos:**
- Dupla contagem de partidas ao agregar classificações.
- Complexidade de calendário entre arenas (conflitos de data).

**Complexidade estimada:** alta.

**Ordem recomendada:** 5º.

**Decisões de arquitetura a tomar agora:**
- A classificação da liga é derivada (calculada) ou materializada?
- Uma arena pode pertencer a mais de uma liga/temporada simultaneamente?

## 5. Transferências entre clubes

**Descrição:** mover um jogador entre clubes (ou entre elencos de clubes
diferentes) com histórico e validação.

**Dependências:**
- Modelo de clubes/elencos (já implementado em `club_squads`/
  `club_squad_members`).
- Vínculo opcional `user_id` em `club_members` para rastrear o jogador real
  entre clubes.

**Impacto no schema:**
- `transfers` (jogador, clube origem, clube destino, data, status) ou
  histórico de movimentação em `club_member_history`.
- `club_members.user_id` passa a ser único quando preenchido (rastrear a
  mesma pessoa entre clubes).

**Impacto no backend:**
- Serviço de transferência com validação (jogador não pode estar em dois
  clubes ativos, janela de transferência se necessário).
- Registro em `club_audit_logs` (padrão já existente).

**Impacto no frontend:**
- Ação "transferir" na página do clube/elenco; confirmação e exibição do
  histórico.

**Riscos:**
- Duplicar jogadores sem `user_id` (nomes iguais para pessoas diferentes).
- Quebrar vínculos com elencos históricos (preservar histórico).

**Complexidade estimada:** média-alta.

**Ordem recomendada:** 6º.

**Decisões de arquitetura a tomar agora:**
- `user_id` obrigatório em `club_members` para transferência ou apenas
  recomendado?
- Transferência move o registro ou cria histórico + novo registro?

## 6. Rankings gerais entre campeonatos

**Descrição:** rankings globais por esporte (artilharia, assistências,
cartões, aproveitamento) agregando estatísticas de todas as arenas.

**Dependências:**
- Módulo de estatísticas (já implementado) com cálculo por esporte.
- Vínculo `user_id` em `team_members`/`club_members` para identificar a mesma
  pessoa em arenas diferentes.

**Impacto no schema:**
- Possivelmente nenhuma tabela nova; ranking derivado das `match_events`
  agregadas.
- Índices em `match_events` por `type`/`entry_id` se o volume crescer.

**Impacto no backend:**
- Endpoints públicos de ranking com filtro por esporte/período e paginação.
- Cache da agregação se o custo subir.

**Impacto no frontend:**
- Página pública de rankings com abas por esporte e métrica.

**Riscos:**
- Identidade ambígua sem `user_id` (jogadores com o mesmo nome).
- Custo de agregação em banco com muitos eventos.

**Complexidade estimada:** média.

**Ordem recomendada:** 7º.

**Decisões de arquitetura a tomar agora:**
- Ranking por identidade (`user_id`) ou por inscrição/jogador cadastrado?
- Cache da agregação vs. consulta direta.

## 7. Regulamentos por campeonato

**Descrição:** permitir que cada campeonato defina seu regulamento (texto,
regras de pontuação, desempate, número de substituições, etc.) e exibi-lo
publicamente.

**Dependências:**
- Configurações atuais da arena (pontos, empate, sets) já existem; estender
  com campos opcionais.

**Impacto no schema:**
- `championship_regulations` (championship_id 1:1, texto, campos de regras
  por esporte, versão) ou colunas novas em `championships`.

**Impacto no backend:**
- Validação dos campos por esporte; endpoint público de regulamento.
- Histórico de versões do regulamento (se necessário).

**Impacto no frontend:**
- Editor de regulamento no painel; seção pública na página da arena.

**Riscos:**
- Regras conflitantes com o cálculo automático de pontos (decisão de qual
  prevalece).

**Complexidade estimada:** baixa-média.

**Ordem recomendada:** 2º.

**Decisões de arquitetura a tomar agora:**
- Regulamento é texto livre + campos estruturados, ou só texto?
- Precisa de versionamento?

## 8. Documentos e anexos

**Descrição:** upload de documentos (comprovantes de pagamento, fichas de
inscrição, estatutos) vinculados a campeonatos, equipes ou partidas.

**Dependências:**
- Decisão de armazenamento (hoje imagens são só URL; ver item 10 do ciclo de
  infra em `docs/DEPLOY_ROLLBACK.md`).
- Permissões detalhadas (quem pode ver/baixar cada documento).

**Impacto no schema:**
- `attachments` (entidade vinculada, tipo, storage key/URL, nome original,
  tamanho, MIME, criado por).
- Política de privacidade: flag de visibilidade (público/privado).

**Impacto no backend:**
- Endpoints de upload/download com validação de tamanho/tipo.
- Storage: S3-compatível (ex.: Cloudflare R2) ou Neon/arquivos locais —
  decisão pendente.
- Autorização por entidade vinculada.

**Impacto no frontend:**
- Lista de anexos com upload/progresso/download nas telas administrativas.

**Riscos:**
- Malware/arquivos maliciosos — validar MIME e limite de tamanho.
- Expor arquivos privados — URL assinada ou proxy com autorização.

**Complexidade estimada:** média.

**Ordem recomendada:** 9º.

**Decisões de arquitetura a tomar agora:**
- Provedor de storage e URLs assinadas vs. proxy autenticado.
- Visibilidade padrão dos anexos (privado por padrão?).

## 9. Árbitros

**Descrição:** cadastro de árbitros, escalas por partida e exibição pública
na partida.

**Dependências:**
- Rotas administrativas de partidas já existem; aproveitar o fluxo de edição
  de metadados (campo `referee` já existe em `matches`).

**Impacto no schema:**
- `referees` (nome, esporte, contato opcional, criado por) e
  `match_referees` (match_id, referee_id, função principal/auxiliar) ou
  coluna `referee_id` em `matches`.

**Impacto no backend:**
- CRUD de árbitros; escala (vínculo) por partida; evitar conflito de horário
  do mesmo árbitro em duas partidas.

**Impacto no frontend:**
- Gestão de árbitros no painel; exibição na página pública da partida.

**Riscos:**
- Dados pessoais do árbitro (contato) vazando em página pública.

**Complexidade estimada:** baixa-média.

**Ordem recomendada:** 8º.

**Decisões de arquitetura a tomar agora:**
- Árbitro é entidade global ou por campeonato?
- Quais dados são públicos (nome) e quais privados (contato)?

## 10. Locais e quadras

**Descrição:** cadastro de locais (ginásios, campos, quadras) com endereço,
capacidade e vínculo às partidas.

**Dependências:**
- Nenhuma grande; campo `venue` já existe em `matches` como texto livre.

**Impacto no schema:**
- `venues` (nome, endereço, capacidade opcional, esportes compatíveis,
  criado por).
- `matches.venue` passa a ser opcionalmente `venue_id` (FK) mantendo o texto
  como fallback.

**Impacto no backend:**
- CRUD de locais por organizador; validação de endereço.
- Evitar reserva dupla do mesmo local no mesmo horário.

**Impacto no frontend:**
- Gestão de locais; seletor na criação/edição de partida; mapa/endereço na
  página pública.

**Riscos:**
- Geolocalização/API de mapas adiciona dependência externa — manter opcional.

**Complexidade estimada:** baixa-média.

**Ordem recomendada:** 1º.

**Decisões de arquitetura a tomar agora:**
- Local pertence ao organizador (biblioteca) ou é por campeonato?
- Integrar mapa (Google Maps/Leaflet) ou apenas endereço textual?

## 11. Cobrança de inscrição

**Descrição:** cobrar taxa de inscrição (PIX/cartão) com status de pagamento
por inscrição.

**Dependências:**
- Decisão de produto e de provedor de pagamento (Stripe, Mercado Pago, PIX).
- Documentos e anexos (comprovantes) e notificações.

**Impacto no schema:**
- `payments` (inscrição, valor, status, provedor, id externo, data) e
  `payment_intents`/comprovantes.
- Status de pagamento na `championship_entries`.

**Impacto no backend:**
- Integração com provedor (webhooks de confirmação), idempotência e
  reembolso.
- Regras: inscrição confirmada somente com pagamento? Cancelamento/estorno.

**Impacto no frontend:**
- Tela de pagamento para o participante; status de pagamento no painel do
  organizador.

**Riscos:**
- Fraude, chargeback e erros de conciliação.
- LGPD/financeiro: retenção e exposição de dados de pagamento (usar provedor
  tokenizado, nunca armazenar dados de cartão).
- Cobrança antes de regras de inscrição estáveis gera retrabalho.

**Complexidade estimada:** alta.

**Ordem recomendada:** 10º.

**Decisões de arquitetura a tomar agora:**
- Provedor e mercado (Brasil: Mercado Pago/PIX vs. Stripe).
- Fluxo: pagamento obrigatório antes de confirmar inscrição ou após?

## 12. PWA

**Descrição:** transformar o frontend em PWA (instalável, offline básico,
notificações push opcionais).

**Dependências:**
- Build Vite atual; adicionar manifest e service worker.
- HTTPS (já garantido por Vercel/Render).

**Impacto no schema:**
- Nenhum (push pode usar `notifications` já existente + subscription
  endpoint).

**Impacto no backend:**
- Endpoints de assinatura push (VAPID) se notificações push forem incluídas.

**Impacto no frontend:**
- `manifest.webmanifest`, service worker com cache de assets, estratégia
  offline para páginas públicas.
- Prompt de instalação e badges.

**Riscos:**
- Cache do service worker servir versões antigas (estratégia de cache
  cuidadosa e atualização de versão).
- Notificações push exigem consentimento e infraestrutura de envio.

**Complexidade estimada:** média.

**Ordem recomendada:** 11º.

**Decisões de arquitetura a tomar agora:**
- Escopo offline: só leitura pública ou também rascunho offline?
- Incluir notificações push já ou somente instalabilidade/cache?

## 13. Internacionalização

**Descrição:** suporte a múltiplos idiomas (pt-BR primeiro, depois outros)
com traduções e formatos de data/número locais.

**Dependências:**
- Extração de strings do frontend (hoje textos estão embutidos nos
  componentes/páginas).

**Impacto no schema:**
- Nenhum (traduções no frontend); conteúdo criado pelo usuário não é
  traduzido automaticamente.

**Impacto no backend:**
- Mensagens de erro atuais são em pt-BR; decidir se a API retorna códigos e o
  frontend traduz, ou se a API recebe locale.

**Impacto no frontend:**
- Biblioteca de i18n (ex.: react-i18next ou i18next) ou i18n nativo
  (Intl API para datas/números).
- Detecção de idioma do navegador, seletor e persistência.

**Riscos:**
- Escopo grande de tradução; começar com strings de UI, não conteúdo.
- Datas/números mal formatados por locale.

**Complexidade estimada:** média-alta.

**Ordem recomendada:** 12º.

**Decisões de arquitetura a tomar agora:**
- Biblioteca vs. Intl API nativa + dicionário próprio.
- A API deve aceitar `Accept-Language` ou o frontend traduz tudo?

---

## Não escopo (por decisão de produto)

- Solicitação pública de inscrição: reaberta apenas dentro do item
  "Convites de jogadores", se o produto decidir.
- Monetização além da cobrança de inscrição (assinaturas, publicidade).
- Aplicativo nativo (React Native/Expo) sem validação de demanda.
- Atualizações em tempo real (WebSocket) enquanto as regras de placar e
  eventos não estiverem estáveis.