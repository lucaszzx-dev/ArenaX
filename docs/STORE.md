# ArenaX Store — Planejamento

Última atualização: 4 de agosto de 2026.

Documento complementar ao `docs/POST_MVP.md`. Define a arquitetura, o modelo de negócio e a evolução da ArenaX Store sem implementar código.

## 1. Objetivo

Permitir que usuários encontrem produtos esportivos relacionados à plataforma:

- bolas, uniformes, chuteiras, tênis e acessórios;
- equipamentos e material de treino;
- itens para árbitros;
- redes, cones, bombas, garrafas e itens de organização esportiva.

Nesta fase: **sem checkout próprio, sem pagamentos, sem marketplace**. Prioridade é catálogo, categorias, busca, filtros, cards de produto e links externos/afiliados.

## 2. Separação de Domínios

```
ArenaX Competition (núcleo atual)  ← nunca é poluída pela Store
ArenaX Store (novo domínio)        ← catálogo + afiliados
```

- Store nunca interfere em fluxos de administração de competições.
- Store evolui independentemente (schema, rotas e módulos próprios).
- Competição e Store se conectam apenas conceitualmente (ex.: sugestão de material por esporte).

## 3. Modelo de Negócio — Opções

| Modelo | Complexidade Op. | Complexidade Jurídica | Risco Financeiro | Decisão |
|--------|------------------|----------------------|------------------|---------|
| **A) Afiliados** | Baixa | Baixa | Zero | ✅ **Escolhida (fase inicial)** |
| B) Marketplace | Alta | Alta | Médio | Fase 3 |
| C) Parceiros Esportivos | Média | Média | Baixo | Fase 2 |
| D) Publicidade/Patrocínio | Baixa | Baixa | Zero | Complementar |
| E) Venda Direta | Muito Alta | Muito Alta | Muito Alto | Não |

### Estratégia Inicial: Afiliados

**Vantagens:** zero risco financeiro/jurídico; implementação rápida; escalável por feed; complementar ao core.

**Riscos:** dependência de comissão de terceiros; redirect sai do ArenaX; catálogo pode desatualizar.

**Dependências técnicas:** feed de produtos; `store_partners` com `affiliate_base_url`; validador de URL externa (HTTPS, domínio allowlist); métricas de cliques/conversão.

**Evolução:**
```
Fase 1 (agora):  Afiliados → redirect externo
Fase 2 (6-12m):  Parceiros diretos → feed API sincronizado
Fase 3 (12m+):   Marketplace → checkout próprio opcional
```

## 4. Arquitetura Frontend

```
frontend/src/features/store/        (NOVO)
├── store-api.ts
├── store-query.ts
├── components/
│   ├── ProductCard.tsx
│   ├── ProductGrid.tsx
│   ├── CategoryNav.tsx
│   └── SearchFilters.tsx
└── pages/
    ├── StoreHomePage.tsx
    ├── CategoryPage.tsx
    └── ProductDetailPage.tsx
```

**Rotas:** `/store`, `/store/c/:categorySlug`, `/store/p/:productSlug` — todas atrás da flag `store.enabled`.

**Menu global:** `STORE` apenas se catálogo > 50 produtos ativos.

## 5. Arquitetura Backend

```
backend/src/store/                  (NOVO)
├── store-repository.ts
├── drizzle-store-repository.ts
├── store-service.ts
├── store-routes.ts
├── store-validation.ts
└── partners/
    ├── partner-sync-service.ts
    └── partner-adapters/           (um por parceiro)
```

**Rotas:** públicas `GET /api/store/categories`, `GET /api/store/products`, `GET /api/store/products/:slug`, `GET /api/store/featured`; admin `POST/PUT/DELETE /api/admin/store/*`.

## 6. Schema Futuro (Sem Migrations)

| Tabela | Objetivo | Campos Principais | FKs | Visibilidade | Proprietário | Índices | Retenção | Risco Privacidade |
|--------|----------|-------------------|-----|--------------|--------------|---------|----------|-------------------|
| `store_categories` | Categorias de produtos | `id`, `name`, `slug`, `sport`, `parent_id`, `sort_order` | `parent_id` self-ref | Pública | Sistema | `slug` unique, `sport` | Permanente | Baixo |
| `store_partners` | Parceiros/fornecedores | `id`, `name`, `slug`, `logo_url`, `website_url`, `affiliate_base_url`, `commission_pct`, `is_active` | — | Pública (ativos) | Admin | `slug` unique | Permanente | Baixo |
| `store_products` | Catálogo | `id`, `partner_id`, `category_id`, `name`, `slug`, `description`, `price_cents`, `currency`, `image_url`, `external_url`, `sport`, `is_featured`, `is_sponsored`, `availability`, `metadata` (jsonb) | `partner_id`, `category_id` | Pública | Partner/Admin | `slug` unique, `(category_id, is_featured)`, `(sport, is_active)` | 2 anos pós-inativo | Baixo |

> **Decisão:** Não criar `store_orders`, `store_cart`, `store_payments` agora.

## 7. Dados do Produto

| Campo | Tipo | Obrigatório | Fonte |
|-------|------|-------------|-------|
| `name` | string | Sim | Parceiro/Manual |
| `slug` | string | Sim | Auto (name) |
| `description` | text | Não | Parceiro (HTML sanitizado) |
| `price_cents` | integer | Sim | Parceiro (BRL = centavos) |
| `currency` | char(3) | Sim | Default `BRL` |
| `image_url` | url | Não | CDN parceiro |
| `external_url` | url | Sim | Link afiliado (com tracking) |
| `category_id` | uuid | Sim | Mapa manual |
| `partner_id` | uuid | Sim | Auto |
| `sport` | text | Não | Futebol, futsal, basquete, vôlei, geral |
| `is_featured` / `is_sponsored` | boolean | Não | Admin |
| `availability` | enum | Não | `in_stock`, `low_stock`, `out_of_stock`, `pre_order` |
| `metadata` | jsonb | Não | Tamanho, cor, marca, material |

## 8. Origens do Catálogo (Futuro)

- Cadastro interno (início);
- feed/API externa de parceiros (Fase 2) — **nunca scraping frágil**;
- afiliados (Fase 1).

## 9. SEO da Store

- Páginas públicas indexáveis: `/store`, categorias, produtos.
- JSON-LD `Product` + `Organization`.
- Metadata e Open Graph por produto.
- `noindex` para produtos inativos/fora de estoque.

## 10. Monetização

- Afiliados: comissão por venda (Fase 1).
- Patrocínios: produtos marcados "Patrocinado" (Fase 2).
- Marketplace / split payment (Fase 3, opcional).

> **Regra:** Zero paywall no produto atual. Store é complementar, nunca bloqueia funcionalidades core.

## 11. Privacidade / Jurídico

- Tracking afiliado com ID anonimizado (hash user_id) — não compartilhar PII.
- Atualizar Termos de Uso: links afiliados não são endosso; responsabilidade do produto é do parceiro.
- Criar Termos de Parceria/Store (comissão, SLA do feed, responsabilidade).

## 12. Riscos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Catálogo desatualizado (preço/estoque) | Médio | Sync diária, cache TTL 6h, badge "Verificar disponibilidade" |
| Afiliado encerra programa | Médio | Múltiplos parceiros, diversificação |
| URL maliciosa | Alto | Allowlist de domínios, HTTPS obrigatório, validação backend |

## 13. O Que Não Será Implementado Agora

- Checkout, carrinho, pagamentos, marketplace, estoque próprio;
- scraping de catálogo;
- qualquer alteração no schema atual.
