# ArenaX AI — Assistente Inteligente

Última atualização: 4 de agosto de 2026.

Documento complementar ao `docs/POST_MVP.md`. Define o conceito, a arquitetura e a segurança da IA de suporte e organização do ArenaX, sem implementar código.

## 1. Objetivo

Assistente conversacional para:

**Suporte:** explicar como criar competição, formatos, cadastro de equipes, regras da plataforma e erros comuns.

**Organização:** ajudar o organizador a configurar a competição, sugerir formato conforme a quantidade de equipes, explicar regras/configurações existentes, classificação, chaveamento e calendário.

**Insights (futuro):** resumo de rodada, destaques, estatísticas, resumo de partida e desempenho de equipes/jogadores.

## 2. Regra Fundamental

> A IA **nunca** altera resultados, partidas, participantes, classificação, configurações ou dados administrativos sem confirmação explícita do usuário.

Na prática: a IA é **assistente consultivo**. Toda ação mutável passa por UI com botão "Confirmar" do usuário. Nenhuma tool de escrita (create/update/delete) é exposta à IA.

## 3. Conhecimento: Base de Conhecimento (RAG)

- Fontes: `docs/` do produto, FAQs curadas, regras da plataforma, troubleshooting e modalidades suportadas.
- Versionamento: cada ingestão gera `assistant_knowledge_base` com `version` semver (`1.0.0`, `1.1.0`, ...).
- Atualização: job agendado ou webhook que re-indexa documentos alterados.
- Separação obrigatória:
  - `platform_rules` → "Como usar ArenaX" (produto);
  - `sport_rules` → "Regras oficiais do esporte" — **nunca apresentadas como oficiais sem fonte**; exibir aviso "consulte a federação oficial".
- Embeddings: `pgvector` no Postgres ou provider externo.

## 4. Arquitetura de Integração

```
Frontend (ChatWidget)
    │ HTTPS / SSE (streaming)
    ▼
Backend: Assistant Routes
  - Auth + Rate Limit + Validation
  - Carrega conversa + contexto (championship_id se houver)
    ▼
Assistant Service (Orquestrador)
  1. Prompt Guard (injeção, PII, instruções conflitantes)
  2. RAG: busca na Knowledge Base
  3. Tool Calling (read-only: info da competição, regras)
  4. Monta prompt final + system prompt
    ▼
LLM Proxy (Backend)
  - Streaming (SSE), cost tracking, fallback de providers
  - Log de auditoria sem conteúdo sensível
    ▼
Provider LLM (API externa)
```

## 5. Módulos Backend Futuros

```
backend/src/assistant/              (NOVO)
├── assistant-repository.ts
├── drizzle-assistant-repository.ts
├── assistant-service.ts
├── assistant-routes.ts
├── assistant-validation.ts
├── knowledge-base/
│   ├── kb-service.ts
│   ├── kb-loader.ts
│   └── kb-versioning.ts
├── security/
│   ├── prompt-guard.ts
│   ├── data-isolation.ts
│   └── rate-limiter.ts
├── tools/                          (somente leitura)
│   ├── championship-info.ts
│   ├── format-suggester.ts
│   └── rule-explainer.ts
└── llm-proxy/
    ├── llm-client.ts
    ├── streaming-handler.ts
    └── cost-tracker.ts
```

**Rotas:** `POST /api/assistant/conversations`, `GET /api/assistant/conversations/:id`, `POST /api/assistant/conversations/:id/messages`, `GET /api/assistant/conversations/:id/messages` — todas autenticadas e limitadas ao owner (RLS).

## 6. Schema Futuro (Sem Migrations)

| Tabela | Objetivo | Campos Principais | FKs | Visibilidade | Índices | Retenção | Risco Privacidade |
|--------|----------|-------------------|-----|--------------|---------|----------|-------------------|
| `assistant_conversations` | Sessões de chat | `id`, `user_id`, `championship_id` (nullable), `title`, `status`, `metadata` (jsonb) | `user_id`, `championship_id` | Privada (owner) | `(user_id, created_at)`, `championship_id` | 1 ano inativo | **Alto** |
| `assistant_messages` | Mensagens | `id`, `conversation_id`, `role`, `content`, `tokens_input`, `tokens_output`, `model`, `tool_calls` (jsonb), `tool_results` (jsonb), `error` | `conversation_id` | Privada (owner) | `(conversation_id, created_at)` | 1 ano inativo | **Alto** |
| `assistant_knowledge_base` | KB versionada para RAG | `id`, `version`, `source`, `title`, `content`, `tags`, `sport`, `language`, `embedding_vector` (pgvector), `is_active` | — | Interna (sistema) | `version`, `(source, sport)` | Permanente (versionado) | Baixo |

> RLS obrigatório em `assistant_conversations` e `assistant_messages` por `user_id`. A IA nunca acessa conversa ou dado de outro usuário.

## 7. Segurança da IA

| Camada | Proteção |
|--------|----------|
| Input | Prompt injection: heurísticas + classifier; bloquear `ignore previous`, `system:`, `act as` |
| Input | PII/Secrets: redação automática (email, CPF, tokens) antes do LLM |
| Contexto | Data isolation: RLS + validação de `championship_id` via permissão do usuário |
| Contexto | Cross-organizer: IA nunca recebe dados de campeonato sem permissão |
| Tools | Zero tool writing; somente leitura |
| Output | Sanitização: sem IDs internos, SQL, configs |
| Rate limit | Por usuário/hora, burst por conversa, quota mensal por plano |
| Auditoria | `user_id`, `conversation_id`, `tokens`, `tools_used`, `latency`, `error` (sem conteúdo) |

### Permissões da IA

| Contexto | PODE | NÃO PODE |
|----------|------|----------|
| Visitante | Explicar produto, FAQ público, regras plataforma | Acessar dados de campeonato, criar conversa persistente |
| Participante | Ver seus campeonatos, explicar formato/regras | Alterar inscrição, ver dados de outros |
| Organizador (owner) | Configurar campeonato (read-only), sugerir formato, explicar classificação, troubleshooting | Alterar resultados/partidas/participantes/classificação/configurações sem confirmação explícita via UI |
| Admin | Treinar KB, métricas, moderação | — |

## 8. Custos e Rate Limit

- Quota por usuário/plano; cache de respostas frequentes; modelos menores para tarefas simples.
- Streaming via SSE reduz latência percebida e custo de espera.
- Log de custo por conversa (`tokens_input`/`tokens_output`/`model`) para controle.

## 9. Privacidade / LGPD

- Conversas = dados pessoais: direito de acesso, retificação e exclusão (`DELETE /api/assistant/conversations/:id`).
- Dados enviados ao LLM: anonimizados (sem PII quando possível).
- Retenção: 1 ano inativo; exclusão total sob demanda.
- Atualizar Política de Privacidade e Termos de Uso; adicionar aviso de IA na interface.

## 10. Evolução

```
Fase 1: Suporte (KB + RAG + chat)
Fase 2: Organização (tool read-only + contexto competição)
Fase 3: Insights (resumo de rodada, destaques, estatísticas)
```

## 11. O Que Não Será Implementado Agora

- Nenhum código de IA, chatbot, RAG, LLM proxy;
- nenhuma tool de escrita;
- nenhuma migration;
- nenhuma dependência externa nova (SDK/API LLM).
