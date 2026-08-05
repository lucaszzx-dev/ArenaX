# ArenaX — Planejamento Pós-MVP

Última atualização: 4 de agosto de 2026.

Este documento consolida o planejamento técnico e de produto para a expansão do ArenaX após o MVP. As novas verticais são:

1. **ArenaX Store** — catálogo de produtos esportivos (afiliados/parceiros)
2. **ArenaX AI / Suporte Inteligente** — assistente para organizadores e participantes
3. **Hub de Mídia e Transmissões** — integração com YouTube, Twitch, redes sociais
4. **Melhor Integração Social** — links sociais, compartilhamento, descoberta

> **Princípio fundamental:** O MVP atual (competições, clubes, partidas, classificações) deve continuar funcionando independentemente. As novas áreas são **aditivas**, não invasivas.

---

## 1. Visão Geral da Arquitetura Pós-MVP

### Separação de Domínios

`
ArenaX Competition (núcleo atual)
├── Championships, Matches, Clubs, Participants
├── Statistics, Knockout, Notifications
├── Public profiles, Public pages
└── Auth, Permissions, Audit

ArenaX Store (novo domínio)
├── Products, Categories, Partners
├── Affiliate links, Sponsored products
└── Search, Filters, Product cards

ArenaX AI (novo domínio)
├── Conversations, Messages
├── Knowledge Base (RAG)
├── Support tools, Organization helpers
└── Security: prompt injection, data isolation

ArenaX Media (novo domínio)
├── Competition media (streams, highlights)
├── Social links (Instagram, TikTok, YouTube)
├── Match media (photos, videos)
└── Embed validation, Provider allowlist
`

### Princípios de Arquitetura

| Princípio | Descrição |
|-----------|-----------|
| **Isolamento de domínios** | Store, AI, Media evoluem independentemente de Championships |
| **Feature flags** | Novas áreas ativadas por flag; rollback instantâneo |
| **Zero breaking changes** | APIs atuais não mudam; novas rotas em /api/v2/* ou namespaces |
| **Permissões herdadas** | AI e Media respeitam RBAC existente (organizer, participant, public) |
| **Dados privados por padrão** | Novas tabelas com RLS/owner_id; nenhuma exposição cross-organizer |

---

## 2. Roadmap por Fases

### PÓS-MVP 1 — Baixo Risco / Alto Valor (Meses 1-2)

| Feature | Objetivo | Valor | Complexidade | Dependências |
|---------|----------|-------|--------------|--------------|
| **Links sociais por competição/clube** | Instagram, TikTok, YouTube, website opcionais | Descoberta, credibilidade | Baixa | Validação URL, schema competition_social_links, club_social_links |
| **Mídia básica: URL de transmissão ao vivo** | YouTube Live, Twitch embed na página pública | Engajamento, "Assistir ao vivo" | Baixa | Provider allowlist, validação URL, estado ativo/inativo |
| **Melhores momentos (URLs)** | Vincular highlights por partida/rodada | Conteúdo, retenção | Baixa | match_media, competition_media |
| **SEO público: metadata, OG, URLs amigáveis** | Indexação competições/clubes/partidas | Descoberta orgânica | Média | Frontend meta tags, sitemap, robots.txt |

**Critério de saída:** Páginas públicas com transmissão ativa exibem "Assistir ao vivo"; links sociais validados; SEO básico funcional.

---

### PÓS-MVP 2 — Crescimento (Meses 3-5)

| Feature | Objetivo | Valor | Complexidade | Dependências |
|---------|----------|-------|--------------|--------------|
| **ArenaX AI — Suporte (Fase 1)** | Chat explicativo: como criar campeonato, formatos, regras da plataforma | Redução suporte humano, onboarding | Média | Knowledge base, RAG, proxy LLM, rate limit, conversation history |
| **ArenaX AI — Organização (Fase 1)** | Sugerir formato conforme qtd. equipes, explicar configurações | Agilidade organizador | Média | Contexto campeonato, tool calling (read-only) |
| **ArenaX Store — Catálogo + Afiliados** | Produtos esportivos com links externos (afiliados) | Receita passiva, utilidade | Média | store_products, store_categories, store_partners, feed parceiros |
| **Busca e filtros Store** | Categoria, esporte, preço, destaque | UX descoberta | Média | Indexação, paginação |
| **IA: Knowledge Base versionada** | Documentação produto, FAQs, troubleshooting | Base confiável para IA | Média | CMS simples, versionamento, source-of-truth |

**Critério de saída:** IA responde dúvidas de suporte sem alucinar regras esportivas; Store exibe catálogo com links afiliados funcionando; Knowledge base versionada.

---

### PÓS-MVP 3 — Monetização (Meses 6+)

| Feature | Objetivo | Valor | Complexidade | Dependências |
|---------|----------|-------|--------------|--------------|
| **Store: Marketplace / Parceiros diretos** | Produtos de parceiros esportivos com comissão | Receita ativa | Alta | Contratos, feed API, sincronização estoque/preço |
| **Plano Premium Organizador** | Recursos avançados: branding, analytics, IA premium | Receita recorrente | Alta | Billing (Stripe/Mercado Pago), feature gates |
| **IA: Insights (rodada, destaques, stats)** | Resumos automáticos de partida/campeonato | Diferencial, engajamento | Alta | Acesso dados agregados, prompt engineering, custos LLM |
| **Patrocínios / Destaque competições** | Competição patrocinada no Explore | Receita publicidade | Média | Ad server leve, etiqueta "Patrocinado", frequência |
| **Pagamentos (inscrição, Store)** | Checkout próprio opcional | Controle financeiro | Muito Alta | PCI, LGPD, conciliação, reembolso |

**Critério de saída:** Pelo menos uma linha de receita ativa (afiliados ou premium); IA gerando insights úteis; base para pagamentos preparada.

---

## 3. Modelo de Dados Futuro (Conceitual — Sem Migrations)

### 3.1 Store

| Tabela | Objetivo | Principais Campos | FKs | Visibilidade | Proprietário | Índices | Retenção | Risco Privacidade |
|--------|----------|-------------------|-----|--------------|--------------|---------|----------|-------------------|
| store_categories | Categorias de produtos | id, 
ame, slug, sport, parent_id, sort_order | parent_id self-ref | Pública | Sistema | slug unique, sport | Permanente | Baixo |
| store_partners | Parceiros/fornecedores | id, 
ame, slug, logo_url, website_url, ffiliate_base_url, commission_pct, is_active | — | Pública (parceiros ativos) | Admin | slug unique | Permanente | Baixo |
| store_products | Catálogo de produtos | id, partner_id, category_id, 
ame, slug, description, price_cents, currency, image_url, external_url, sport, is_featured, is_sponsored, vailability, metadata (jsonb) | partner_id, category_id | Pública | Partner/Admin | slug unique, (category_id, is_featured), (sport, is_active) | 2 anos pós-inativo | Baixo (dados produto) |

> **Decisão:** Não criar store_orders, store_cart, store_payments agora. Afiliados = redirect externo. Checkout próprio só no PÓS-MVP 3.

### 3.2 Media

| Tabela | Objetivo | Principais Campos | FKs | Visibilidade | Proprietário | Índices | Retenção | Risco Privacidade |
|--------|----------|-------------------|-----|--------------|--------------|---------|----------|-------------------|
| competition_social_links | Links sociais da competição | id, championship_id, platform (enum: instagram, tiktok, youtube, website, twitter, facebook), url, display_name, sort_order | championship_id | Pública (se championship publicado) | Organizer | (championship_id, platform) unique | Permanente | Baixo (URLs públicas) |
| club_social_links | Links sociais do clube | id, club_id, platform, url, display_name, sort_order | club_id | Pública | Club Owner | (club_id, platform) unique | Permanente | Baixo |
| competition_media | Transmissões/highlights da competição | id, championship_id, 	ype (enum: live_stream, highlights, photo_gallery, official_video), provider (youtube, twitch, vimeo, instagram, tiktok, custom), provider_video_id, url, embed_url, 	itle, description, 	humbnail_url, starts_at, ends_at, is_active, is_featured, sort_order | championship_id | Pública (se championship publicado) | Organizer | (championship_id, type, is_active), (provider, provider_video_id) | 3 anos | Baixo (embeds públicos) |
| match_media | Mídia da partida | id, match_id, 	ype, provider, provider_video_id, url, embed_url, 	itle, 	humbnail_url, captured_at, sort_order | match_id | Pública (se championship publicado) | Organizer | (match_id, type), (provider, provider_video_id) | 3 anos | Baixo |

> **Decisão:** Não armazenar vídeo/arquivo. Apenas URLs/embeds validados. Providers permitidos em allowlist de configuração.

### 3.3 AI Assistant

| Tabela | Objetivo | Principais Campos | FKs | Visibilidade | Proprietário | Índices | Retenção | Risco Privacidade |
|--------|----------|-------------------|-----|--------------|--------------|---------|----------|-------------------|
| ssistant_conversations | Sessões de chat | id, user_id, championship_id (nullable), 	itle, status (active, archived), metadata (jsonb: context, tools_used) | user_id, championship_id | Privada (owner only) | User | (user_id, created_at), championship_id | 1 ano inativo | **Alto** — conteúdo conversas pode ter dados sensíveis |
| ssistant_messages | Mensagens individuais | id, conversation_id, ole (user, assistant, system, tool), content, 	okens_input, 	okens_output, model, 	ool_calls (jsonb), 	ool_results (jsonb), error | conversation_id | Privada (owner only) | User | (conversation_id, created_at) | 1 ano inativo | **Alto** — mesmo acima |
| ssistant_knowledge_base | KB versionada para RAG | id, ersion, source (docs, faq, rules, troubleshooting), 	itle, content, 	ags, sport, language, embedding_vector (pgvector), is_active | — | Interna (sistema) | Admin | ersion, (source, sport), vector index | Permanente (versionado) | Baixo (conteúdo público) |

> **Segurança:** ssistant_conversations e ssistant_messages com **RLS** por user_id. IA **nunca** acessa conversa de outro usuário. championship_id opcional para contexto organizacional — validado via permissão.

---

## 4. Arquitetura Frontend (Novos Módulos)

`
frontend/src/features/
├── auth/                 (existente)
├── championships/        (existente)
├── clubs/                (existente)
├── knockout/             (existente)
├── matches/              (existente)
├── notifications/        (existente)
├── participants/         (existente)
├── public-profiles/      (existente)
├── theme/                (existente)
├── store/                (NOVO)
│   ├── store-api.ts
│   ├── store-query.ts
│   ├── components/
│   │   ├── ProductCard.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── CategoryNav.tsx
│   │   └── SearchFilters.tsx
│   └── pages/
│       ├── StoreHomePage.tsx
│       ├── CategoryPage.tsx
│       └── ProductDetailPage.tsx
├── media/                (NOVO)
│   ├── media-api.ts
│   ├── media-query.ts
│   ├── components/
│   │   ├── LiveStreamBanner.tsx
│   │   ├── MediaGallery.tsx
│   │   ├── SocialLinks.tsx
│   │   └── HighlightsCarousel.tsx
│   └── pages/
│       └── CompetitionMediaPage.tsx
├── assistant/            (NOVO)
│   ├── assistant-api.ts
│   ├── assistant-query.ts
│   ├── components/
│   │   ├── ChatWidget.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── SuggestedPrompts.tsx
│   │   └── ToolCallIndicator.tsx
│   └── pages/
│       └── AssistantPage.tsx
`

### Páginas Públicas (Novas / Estendidas)

| Rota | Descrição | Feature Flag |
|------|-----------|--------------|
| /store | Home da Store (categorias, destaques) | store.enabled |
| /store/c/:categorySlug | Listagem por categoria | store.enabled |
| /store/p/:productSlug | Detalhe produto (redirect afiliado) | store.enabled |
| /c/:championshipSlug/media | Mídia da competição (streams, highlights) | media.enabled |
| /c/:championshipSlug/assistant | IA contextual da competição | ssistant.enabled |
| /assistant | IA global (suporte geral) | ssistant.enabled |

### Navegação Global (Proposta)

`
Header/Menu Principal:
├── COMPETIÇÕES (existente)
├── CLUBES (existente)
├── EXPLORAR (existente)
├── STORE (novo — se flag ativa)
└── Usuário / Login

Contexto Competição (aba lateral ou tabs):
├── Visão Geral
├── Classificação
├── Partidas
├── Participantes
├── MÍDIA (novo — se houver media)
├── IA (novo — botão flutuante ou tab)
└── Configurações (organizador)

Contexto Clube:
├── Visão Geral
├── Elencos
├── Temporadas
├── MÍDIA (novo — links sociais)
└── Configurações
`

> **Regra:** Não adicionar dezenas de itens. STORE no menu global apenas se catálogo > 50 produtos ativos. MÍDIA e IA aparecem **contextualmente** (dentro da competição/clube) — não no menu global.

---

## 5. Arquitetura Backend (Novos Módulos)

`
backend/src/
├── auth/                 (existente)
├── championships/        (existente)
├── clubs/                (existente)
├── knockout/             (existente)
├── matches/              (existente)
├── notifications/        (existente)
├── participants/         (existente)
├── public-profiles/      (existente)
├── observability/        (existente)
├── routes/               (existente — adicionar rotas novas)
├── validation/           (existente)
├── store/                (NOVO)
│   ├── store-repository.ts
│   ├── drizzle-store-repository.ts
│   ├── store-service.ts
│   ├── store-routes.ts
│   ├── store-validation.ts
│   └── partners/         (feed/sync parceiros)
│       ├── partner-sync-service.ts
│       └── partner-adapters/  (um por parceiro)
├── media/                (NOVO)
│   ├── media-repository.ts
│   ├── drizzle-media-repository.ts
│   ├── media-service.ts
│   ├── media-routes.ts
│   ├── media-validation.ts
│   ├── providers/        (validação embed por provider)
│   │   ├── youtube.ts
│   │   ├── twitch.ts
│   │   ├── instagram.ts
│   │   └── tiktok.ts
│   └── embed-validator.ts
└── assistant/            (NOVO)
    ├── assistant-repository.ts
    ├── drizzle-assistant-repository.ts
    ├── assistant-service.ts
    ├── assistant-routes.ts
    ├── assistant-validation.ts
    ├── knowledge-base/     (RAG)
    │   ├── kb-service.ts
    │   ├── kb-loader.ts    (ingestão docs → embeddings)
    │   └── kb-versioning.ts
    ├── security/
    │   ├── prompt-guard.ts     (prompt injection detection)
    │   ├── data-isolation.ts   (RLS enforcement)
    │   └── rate-limiter.ts     (por usuário/conversa)
    ├── tools/              (tool calling read-only)
    │   ├── championship-info.ts
    │   ├── format-suggester.ts
    │   └── rule-explainer.ts
    └── llm-proxy/          (proxy para provider LLM)
        ├── llm-client.ts
        ├── streaming-handler.ts
        └── cost-tracker.ts
`

### Rotas API (Novas — Namespace /api/v2 ou Sub-paths)

| Domínio | Rotas | Auth | Permissão |
|---------|-------|------|-----------|
| Store | GET /api/store/categories, GET /api/store/products, GET /api/store/products/:slug, GET /api/store/featured | Público | — |
| Store (Admin) | POST/PUT/DELETE /api/admin/store/* | Organizador/Admin | Admin only |
| Media | GET /api/championships/:id/media, GET /api/matches/:id/media, GET /api/clubs/:id/social-links | Público (se publicado) | Owner/Participant |
| Media (Write) | POST/PUT/DELETE /api/championships/:id/media, POST/PUT/DELETE /api/clubs/:id/social-links | Organizador/Club Owner | Owner only |
| Assistant | POST /api/assistant/conversations, GET /api/assistant/conversations/:id, POST /api/assistant/conversations/:id/messages, GET /api/assistant/conversations/:id/messages | Usuário autenticado | Owner only (RLS) |
| Assistant (KB) | GET /api/assistant/kb/search (interno) | Sistema | — |

---

## 6. IA — Integração e Segurança

### Arquitetura de Integração LLM

`
Frontend (ChatWidget)
    │ HTTPS / SSE (streaming)
    ▼
Backend: Assistant Routes
  - Auth + Rate Limit + Validation
  - Carrega conversa + contexto (championship_id se houver)
    │
    ▼
Assistant Service (Orquestrador)
  1. Prompt Guard (injecção, PII, instruções conflitantes)
  2. RAG: busca na Knowledge Base (pgvector)
  3. Tool Calling (read-only: championship info, rules)
  4. Monta prompt final + system prompt
    │
    ▼
LLM Proxy (Backend)
  - Streaming de resposta (SSE)
  - Cost tracking (tokens in/out)
  - Fallback providers (OpenAI, Anthropic, local)
  - Log auditoria (sem conteúdo sensível)
    │
    ▼
Provider LLM (API Externa)
`

### Camadas de Segurança

| Camada | Proteção | Implementação |
|--------|----------|---------------|
| **Input** | Prompt injection | Heurísticas + classifier leve; bloquear ignore previous, system:, ct as |
| **Input** | PII / Secrets | Redação automática (email, CPF, tokens) antes de enviar ao LLM |
| **Contexto** | Data isolation | RLS no DB; championship_id validado via getChampionshipRole(user, champ) |
| **Contexto** | Cross-organizer | IA **nunca** recebe dados de campeonato que user não tem permissão |
| **Tools** | Ações admin | **Zero** tool calling que escreve (create/update/delete). Apenas ead |
| **Output** | Vazamento | Sanitização de resposta; não expor IDs internos, SQL, configs |
| **Rate Limit** | Abuso | Por usuário/hora; burst por conversa; quota mensal por plano |
| **Auditoria** | Rastreabilidade | Log: user_id, conversation_id, 	okens, 	ools_used, latency, error (sem conteúdo) |

### Knowledge Base (RAG)

- **Fontes:** docs/ (produto), FAQs curadas, regras da plataforma, troubleshooting, modalidades suportadas
- **Versionamento:** Cada ingestão cria ssistant_knowledge_base com ersion (semver: 1.0.0, 1.1.0...)
- **Atualização:** Job agendado / webhook GitHub → re-indexa docs/ alterados
- **Separação clara:**
  - source: 'platform_rules' → "Como usar ArenaX"
  - source: 'sport_rules' → "Regras oficiais do esporte" (com aviso: *não oficial, consulte federação*)
- **Embeddings:** pgvector no Postgres (já no Neon) ou provider externo (OpenAI embeddings)

### Permissões da IA

| Contexto | O que a IA PODE | O que a IA NÃO PODE |
|----------|-----------------|---------------------|
| Visitante (não logado) | Explicar produto, FAQ público, regras plataforma | Acessar dados de campeonato, criar conversa persistente |
| Participante (logado) | Ver seus campeonatos, explicar formato, regras | Alterar inscrição, ver dados de outros |
| Organizador (owner) | Configurar campeonato (read-only), sugerir formato, explicar classificação, troubleshooting | **Nunca** alterar resultados, partidas, participantes, classificação, configurações sem confirmação explícita via UI |
| Admin (sistema) | Treinamento KB, métricas, moderação | — |

> **Regra de Ouro:** IA é **assistente consultivo**. Toda ação mutável passa por UI com botão "Confirmar" do usuário.

---

## 7. Store — Modelo de Negócio

### Opções Analisadas

| Modelo | Descrição | Complexidade Op. | Complexidade Jurídica | Risco Financeiro | Receita Potencial | Decisão Inicial |
|--------|-----------|------------------|----------------------|------------------|-------------------|-----------------|
| **A) Afiliados** | Links para parceiros (Amazon, Netshoes, Decathlon, etc.) — comissão por venda | **Baixa** | **Baixa** (termo de afiliado) | **Zero** (sem estoque/pagamento) | Média (1-5% por venda) | ✅ **Escolhida** |
| B) Marketplace | Parceiros cadastram produtos; ArenaX processa pedido | Alta | Alta (intermediação, LGPD, consumidor) | Médio (chargeback, fraude) | Alta | Fase 3 |
| C) Parceiros Esportivos | Contratos diretos com marcas/clubes; feed API exclusivo | Média | Média (contratos B2B) | Baixo | Média-Alta | Fase 2 |
| D) Publicidade/Patrocínio | Banners, produtos patrocinados, destaque no catálogo | Baixa | Baixa (termo publicidade) | Zero | Variável | Complementar |
| E) Venda Direta | ArenaX compra estoque, vende, envia | Muito Alta | Muito Alta (e-commerce, logística) | Muito Alto | Alta | Não |

### Estratégia Inicial: Afiliados (Modelo A)

**Vantagens:**
- Zero risco financeiro / jurídico
- Implementação rápida (catálogo + redirect)
- Escalável: adicionar parceiros via feed CSV/API
- Complementar ao core (organizador compra material para campeonato)

**Riscos:**
- Dependência de comissão de terceiros (podem mudar)
- UX: redirect sai do ArenaX (mitigar: abrir nova aba, tracking)
- Catálogo pode ficar desatualizado (preço, estoque) — sincronização diária

**Dependências Técnicas:**
- Feed de produtos (CSV, API, ou cadastro manual inicial)
- store_partners com ffiliate_base_url + parâmetros tracking
- Validador de URL externa (não phishing, HTTPS, domínio allowlist)
- Métricas: cliques, conversão (postback parceiro se disponível)

**Evolução Possível:**
`
Fase 1 (Agora):     Afiliados → redirect externo
Fase 2 (6-12m):     Parceiros diretos → feed API sincronizado + comissão negociada
Fase 3 (12m+):      Marketplace → checkout próprio (opcional) + split payment
`

### Dados do Produto (Catálogo)

| Campo | Tipo | Obrigatório | Fonte | Observação |
|-------|------|-------------|-------|------------|
| 
ame | string | Sim | Parceiro/Manual | Título exibido |
| slug | string | Sim | Auto (name) | URL amigável |
| description | text | Não | Parceiro | HTML sanitizado |
| price_cents | integer | Sim | Parceiro | Em centavos (BRL = 9990 = R$ 99,90) |
| currency | char(3) | Sim | Parceiro | Default BRL |
| image_url | url | Não | Parceiro | CDN parceiro ou upload futuro |
| external_url | url | Sim | Parceiro | Link afiliado (com tracking) |
| category_id | uuid | Sim | Manual/Mapa | FK store_categories |
| partner_id | uuid | Sim | Auto | FK store_partners |
| sport | text | Não | Parceiro/Mapa | Filtro: futebol, futsal, basquete, vôlei, geral |
| is_featured | boolean | Não | Admin | Destaque home |
| is_sponsored | boolean | Não | Admin | Tag "Patrocinado" |
| vailability | enum | Não | Parceiro | in_stock, low_stock, out_of_stock, pre_order |
| metadata | jsonb | Não | Parceiro | Atributos extras: tamanho, cor, marca, material |

---

## 8. Mídia e Transmissões — Detalhamento

### Providers Suportados (Allowlist Inicial)

| Provider | Tipo | Validação | Embed Permitido |
|----------|------|-----------|-----------------|
| YouTube | Live / Video / Shorts | youtube.com/watch?v=, youtu.be/, youtube.com/live/ | <iframe> origin youtube.com |
| Twitch | Live / VOD / Clips | 	witch.tv/videos/, 	witch.tv/channel, clips.twitch.tv/ | <iframe> origin player.twitch.tv |
| Instagram | Reel / Post / Live | instagram.com/reel/, instagram.com/p/, instagram.com/tv/ | <iframe> origin instagram.com (oEmbed) |
| TikTok | Video | 	iktok.com/@user/video/ | <blockquote> + script (lazy load) |
| Vimeo | Video / Live | imeo.com/ | <iframe> origin player.vimeo.com |

### Validação de URL

1. **Allowlist de domínios** (config MEDIA_ALLOWED_PROVIDERS)
2. **Extração de provider_video_id** via regex por provider
3. **Verificação oEmbed / API** (opcional, assíncrona) para confirmar vídeo existe e é embeddable
4. **Sanitização de embed HTML** — apenas <iframe> com sandbox="allow-scripts allow-same-origin allow-presentation" e llowfullscreen
5. **CSP**: rame-src inclui apenas providers permitidos

### Estado da Transmissão

| Campo | Descrição |
|-------|-----------|
| is_active | Boolean — organizador marca "ao vivo agora" |
| starts_at | Agendado — mostra "Inicia em Xh" |
| ends_at | Estimado fim — opcional |
| is_featured | Destaque na página pública (banner topo) |

### UX Página Pública

`
┌─────────────────────────────────────────────┐
│  🔴 AO VIVO — Campeonato X                  │  ← Banner se is_active + live_stream
│  [Assistir no YouTube ▶]                    │
├─────────────────────────────────────────────┤
│  Próximas transmissões:                     │
│  • 15/08 19h — Semifinal A vs B (YouTube)  │
│  • 16/08 20h — Final (Twitch)              │
├─────────────────────────────────────────────┤
│  Melhores Momentos:                         │
│  [📹 Highlights Rodada 5] [📸 Fotos Final]  │
└─────────────────────────────────────────────┘
`

---

## 9. Redes Sociais — Integração

### Campos por Entidade

| Entidade | Plataformas | Validação |
|----------|-------------|-----------|
| Campeonato | Instagram, TikTok, YouTube, Website, Twitter/X, Facebook | URL pattern + HTTPS + domínio allowlist |
| Clube | Instagram, TikTok, YouTube, Website, Twitter/X, Facebook | Idem |

### Regras de Exibição

- **Não carregar scripts externos** automaticamente (performance, privacidade)
- **Ícones SVG inline** (próprios) + link <a href="..." target="_blank" rel="noopener noreferrer">
- **Lazy load** de embeds (Instagram/TikTok) só se usuário clicar "Ver post"
- **Privacidade**: Não enviar referrer para redes sociais (eferrerpolicy="no-referrer")
- **Validação**: Backend rejeita URLs encurtadas (bit.ly, t.co) — exigir URL canônica

---

## 10. SEO / Descoberta

### Melhorias Planejadas

| Área | Ação | Prioridade |
|------|------|------------|
| Metadata | 	itle, description dinâmicos por página pública | Alta |
| Open Graph | og:title, og:description, og:image, og:type, og:url | Alta |
| Twitter Cards | 	witter:card, 	witter:title, 	witter:image | Média |
| JSON-LD | SportsEvent, Organization, Product (Store) | Média |
| Sitemap | /sitemap.xml gerado em build (páginas públicas) | Alta |
| Robots.txt | Permitir /c/*, /clubs/*, /store/*; bloquear /dashboard, /api, /assistant | Alta |
| URLs Amigáveis | /c/:slug, /clubs/:slug, /store/c/:cat, /store/p/:slug | Já implementado |
| Canonical | <link rel="canonical"> em todas páginas públicas | Alta |
| Indexação Condicional | 
oindex se championship.status !== 'PUBLISHED' ou club privado | Alta |

---

## 11. Monetização — Caminhos Futuros (Documentação)

| Linha | Descrição | Quando | Requisitos |
|-------|-----------|--------|------------|
| **Afiliados Store** | Comissão por clique/venda via parceiros | PÓS-MVP 2 | Feed produtos, tracking, termos afiliado |
| **Patrocínios Store** | Produtos/parceiros marcados "Patrocinado" + destaque | PÓS-MVP 2 | Ad server leve, frequência, etiqueta clara |
| **Plano Premium Organizador** | Branding custom, analytics avançado, IA premium, suporte prioritário | PÓS-MVP 3 | Billing, feature gates, trial, cancelamento |
| **Destaque Competições** | "Patrocinado" no Explore / Home | PÓS-MVP 3 | Leilão/lance, etiqueta, limite frequência |
| **IA Premium** | Insights avançados, resumos automáticos, análise tática | PÓS-MVP 3 | Custos LLM controlados, quota por plano |
| **Cobrança Inscrição** | Taxa campeonato (PIX/cartão) — já no ROADMAP.md item 11 | PÓS-MVP 3 | Provedor pagamento, webhooks, conciliação |
| **Publicidade Controlada** | Banners não-intrusivos (ex: rodapé público) | Futuro | Consentimento LGPD, frequência, relevância |

> **Regra:** **Zero paywall no produto atual.** Funcionalidades core (criar campeonato, registrar placar, página pública) sempre gratuitas.

---

## 12. Privacidade / Termos — Impacto Futuro

### Documentos a Atualizar

| Documento | Atualizações Necessárias |
|-----------|--------------------------|
| **Política de Privacidade** | Dados enviados para LLM (anonimizados), embeds redes sociais (carregamento sob demanda), cookies de analytics Store, tracking afiliados, retenção conversas IA (1 ano), base legal para cada processamento |
| **Termos de Uso** | Uso da IA (limitações, não substitui aconselhamento oficial), links afiliados (não endosso), conteúdo terceiros (embeds), moderação conteúdo gerado por usuários (mídia) |
| **Política de Cookies** | Novos cookies: ssistant_session, store_preferences, media_consent (embeds lazy) |
| **Termos de Parceria/Store** | Novo: termos para parceiros afiliados (comissão, SLA feed, responsabilidade produto) |
| **Aviso de IA** | Banner na interface: "Respostas geradas por IA — podem conter imprecisões. Regras esportivas: consulte federação oficial." |

### LGPD / Conformidade

- **Dados IA:** Conversas = dados pessoais. Direito de acesso, retificação, exclusão (via DELETE /api/assistant/conversations/:id)
- **Embeds:** Carregamento lazy = consentimento implícito ao clicar. Documentar na Política.
- **Afiliados:** Tracking ID anonimizado (hash user_id) — não compartilhar PII com parceiros.
- **Retenção:** Conversas IA 1 ano inativo; mídia 3 anos; produtos 2 anos pós-inativo; logs auditoria 2 anos.

---

## 13. Ordem Recomendada de Implementação

### Análise da Ordem Proposta no Prompt

> 1. Mídia + redes sociais
> 2. IA de suporte
> 3. Store com catálogo/afiliados
> 4. Monetização/pagamentos

### ✅ Ordem Recomendada (Ajustada)

| Fase | Itens | Justificativa |
|------|-------|---------------|
| **1** | **Mídia + Redes Sociais** | Baixo risco, alto valor imediato, independentes, melhoram páginas públicas já existentes, SEO benefit |
| **2** | **IA Suporte (Fase 1)** | Diferencial competitivo, reduz suporte humano, base para IA Organização/Insights futuras, reusa KB existente |
| **3** | **Store Catálogo + Afiliados** | Receita passiva, utilidade organizadores (comprar material), valida demanda antes de marketplace |
| **4** | **IA Organização + Insights** | Evolução natural da IA Suporte; precisa de KB madura e dados campeonato |
| **5** | **Monetização (Premium, Patrocínios, Pagamentos)** | Requer base de usuários, produto estável, decisões de negócio validadas |

### Por que não Store antes de IA?

- Store afiliados **precisa de catálogo** (parceiros, feed) — dependência externa
- IA Suporte **usa ativos internos** (docs, FAQ, regras plataforma) — controle total
- IA gera valor **imediato** para usuários atuais; Store gera valor **quando houver volume**

---

## 14. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Prompt injection / vazamento dados IA** | Média | Alto | Prompt guard, RLS, rate limit, auditoria, zero tool writing |
| **Catálogo Store desatualizado (preço/estoque)** | Alta | Médio | Sincronização diária, cache TTL 6h, badge "Verificar disponibilidade" |
| **Embeds redes sociais quebram (API muda)** | Média | Baixo | Lazy load, fallback para link, monitoramento erros embed |
| **Custos LLM explodem** | Média | Alto | Quota por usuário/plano, cache respostas frequentes, modelos menores para tarefas simples |
| **Afiliados mudam comissão / encerram programa** | Média | Médio | Múltiplos parceiros, contrato próprio futuro, diversificação |
| **Regressão no core (championships)** | Baixa | Crítico | Testes E2E obrigatórios, feature flags, deploy canary, rollback < 5min |
| **LGPD / vazamento cross-organizer** | Baixa | Crítico | RLS em todas tabelas novas, testes de acesso cruzado automatizados, pentest anual |

---

## 15. O Que NÃO Foi Implementado (Deliberadamente)

- ❌ Nenhum código funcional de Store, checkout, marketplace, pagamentos
- ❌ Nenhum código de IA, chatbot, RAG, LLM proxy
- ❌ Nenhum embed de redes sociais, player de transmissão
- ❌ Nenhuma migration de banco de dados
- ❌ Nenhuma dependência externa nova (OpenAI SDK, pgvector, etc.)
- ❌ Nenhuma alteração em rotas, schema, componentes existentes
- ❌ Nenhum paywall, monetização, billing
- ❌ Nenhuma alteração em CI/CD, deploy, infraestrutura

> Esta tarefa é **exclusivamente de planejamento e documentação**.

---

## 16. Próximos Passos (Para Implementação Futura)

1. **Aprovar este plano** com stakeholders
2. **Criar ADRs** (Architecture Decision Records) para: LLM provider, RAG strategy, Store affiliate model, Media provider allowlist
3. **Spike técnico** (1-2 dias cada):
   - IA: Prompt guard + RAG com pgvector (PoC)
   - Store: Feed parceiro → normalização → catálogo (PoC)
   - Media: Validador embed YouTube/Twitch (PoC)
4. **Feature flags** no backend/frontend para rollout gradual
5. **Iniciar PÓS-MVP 1** (Mídia + Redes Sociais) — menor risco, entrega rápida

---

## 17. Referências

- docs/ROADMAP.md — Roadmap core (convites, múltiplos organizadores, locais, cobrança, PWA, i18n)
- docs/PLANEJAMENTO.md — Histórico completo MVP
- docs/CLUBES.md — Modelo clubes/temporadas/elencos
- docs/MATA_MATA.md — Chaveamento eliminatório
- docs/PRIVACIDADE_TERMOS.md — Base atual privacidade
- ackend/src/db/schema.ts — Schema atual (referência para FKs)
- rontend/src/features/ — Padrão organização por features
