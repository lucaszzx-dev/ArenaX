# ArenaX Mídia e Transmissões — Planejamento

Última atualização: 4 de agosto de 2026.

Documento complementar ao `docs/POST_MVP.md`. Define o hub de mídia e transmissões do ArenaX, sem implementar código.

## 1. Objetivo

Cada competição (e clube) poderá ter uma área "Mídia" ou "Transmissões" com:

- transmissão ao vivo;
- YouTube, Instagram, TikTok, Vimeo, Twitch;
- melhores momentos (highlights);
- fotos, vídeos e links oficiais.

**Decisão central:** o ArenaX **não armazena vídeo próprio**. Tudo é integração via URL/embed quando permitido pelo provider.

## 2. Transmissões ao Vivo

- Competição cadastra URL da transmissão (YouTube Live, Twitch, outros permitidos).
- Página pública: se houver transmissão ativa → destaque "Assistir ao vivo".
- Sem infraestrutura própria de streaming.

### Validação de URL

1. Allowlist de domínios por provider (config `MEDIA_ALLOWED_PROVIDERS`).
2. Extração de `provider_video_id` via regex por provider.
3. Verificação oEmbed/API (opcional, assíncrona).
4. Sanitização de embed: apenas `<iframe>` com `sandbox="allow-scripts allow-same-origin allow-presentation"` e `allowfullscreen`.
5. CSP: `frame-src` apenas com providers permitidos.

### Providers Suportados (Allowlist Inicial)

| Provider | Tipos | Validação | Embed |
|----------|-------|-----------|-------|
| YouTube | Live / Video / Shorts | `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/live/` | `<iframe>` youtube.com |
| Twitch | Live / VOD / Clips | `twitch.tv/videos/`, `twitch.tv/channel`, `clips.twitch.tv/` | `<iframe>` player.twitch.tv |
| Instagram | Reel / Post / Live | `instagram.com/reel/`, `instagram.com/p/`, `instagram.com/tv/` | `<iframe>` instagram.com (oEmbed) |
| TikTok | Video | `tiktok.com/@user/video/` | `<blockquote>` + script (lazy load) |
| Vimeo | Video / Live | `vimeo.com/` | `<iframe>` player.vimeo.com |

### Estado da Transmissão

| Campo | Descrição |
|-------|-----------|
| `is_active` | "Ao vivo agora" (organizador controla) |
| `starts_at` | Agendamento — mostra "Inicia em Xh" |
| `ends_at` | Fim estimado (opcional) |
| `is_featured` | Destaque no topo da página pública |

## 3. Melhores Momentos

- Vincular vídeos de highlights, Reels, TikToks, YouTube e fotos.
- Relacionados a: competição, partida ou rodada.
- UX: galeria na página pública + painel administrativo para organizador.

## 4. Redes Sociais

Campos opcionais para competição/clube: Instagram, TikTok, YouTube, website, Twitter/X, Facebook — com validação de URL (HTTPS + domínio allowlist).

**Regras de exibição:**
- Não carregar scripts externos automaticamente (performance e privacidade).
- Ícones SVG inline próprios + `<a>` com `rel="noopener noreferrer"` e `referrerpolicy="no-referrer"`.
- Embeds lazy load (Instagram/TikTok) só após clique em "Ver post".
- Backend rejeita URLs encurtadas (bit.ly, t.co) — exigir URL canônica.

## 5. Arquitetura Frontend

```
frontend/src/features/media/        (NOVO)
├── media-api.ts
├── media-query.ts
├── components/
│   ├── LiveStreamBanner.tsx
│   ├── MediaGallery.tsx
│   ├── SocialLinks.tsx
│   └── HighlightsCarousel.tsx
└── pages/
    └── CompetitionMediaPage.tsx
```

**Rotas:** `/c/:championshipSlug/media` (flag `media.enabled`).

## 6. Arquitetura Backend

```
backend/src/media/                  (NOVO)
├── media-repository.ts
├── drizzle-media-repository.ts
├── media-service.ts
├── media-routes.ts
├── media-validation.ts
├── providers/                      (validação embed por provider)
│   ├── youtube.ts
│   ├── twitch.ts
│   ├── instagram.ts
│   └── tiktok.ts
└── embed-validator.ts
```

**Rotas:** públicas `GET /api/championships/:id/media`, `GET /api/matches/:id/media`, `GET /api/clubs/:id/social-links`; escrita `POST/PUT/DELETE` para organizador/owner (somente do próprio domínio).

## 7. Schema Futuro (Sem Migrations)

| Tabela | Objetivo | Campos Principais | FKs | Visibilidade | Índices | Retenção | Risco Privacidade |
|--------|----------|-------------------|-----|--------------|---------|----------|-------------------|
| `competition_social_links` | Links sociais da competição | `id`, `championship_id`, `platform`, `url`, `display_name`, `sort_order` | `championship_id` | Pública (se publicado) | `(championship_id, platform)` unique | Permanente | Baixo |
| `club_social_links` | Links sociais do clube | `id`, `club_id`, `platform`, `url`, `display_name`, `sort_order` | `club_id` | Pública | `(club_id, platform)` unique | Permanente | Baixo |
| `competition_media` | Transmissões/highlights da competição | `id`, `championship_id`, `type` (live_stream, highlights, photo_gallery, official_video), `provider`, `provider_video_id`, `url`, `embed_url`, `title`, `description`, `thumbnail_url`, `starts_at`, `ends_at`, `is_active`, `is_featured`, `sort_order` | `championship_id` | Pública (se publicado) | `(championship_id, type, is_active)`, `(provider, provider_video_id)` | 3 anos | Baixo |
| `match_media` | Mídia da partida | `id`, `match_id`, `type`, `provider`, `provider_video_id`, `url`, `embed_url`, `title`, `thumbnail_url`, `captured_at`, `sort_order` | `match_id` | Pública (se publicado) | `(match_id, type)`, `(provider, provider_video_id)` | 3 anos | Baixo |

## 8. UX Página Pública

```
┌─────────────────────────────────────────────┐
│  🔴 AO VIVO — Campeonato X                  │  ← se is_active + live_stream
│  [Assistir no YouTube ▶]                    │
├─────────────────────────────────────────────┤
│  Próximas transmissões:                     │
│  • 15/08 19h — Semifinal A vs B (YouTube)  │
│  • 16/08 20h — Final (Twitch)              │
├─────────────────────────────────────────────┤
│  Melhores Momentos:                         │
│  [📹 Highlights Rodada 5] [📸 Fotos Final]  │
└─────────────────────────────────────────────┘
```

## 9. SEO

- Mídia pública indexável quando a competição é pública.
- Open Graph por vídeo/destaque.
- `noindex` para competições privadas/rascunho.
- `robots.txt` permitindo apenas páginas públicas.

## 10. Privacidade

- Embeds lazy load = consentimento implícito ao clicar; documentar na Política de Privacidade.
- Não enviar referrer para redes sociais.
- Conteúdo de terceiros: responsabilidade do provider; arena não hospeda vídeo.

## 11. Riscos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Embeds quebram (API/provider muda) | Baixo | Lazy load, fallback para link, monitoramento de erros |
| URL maliciosa / phishing | Alto | Allowlist de domínios, HTTPS obrigatório, sanitização |
| Conteúdo impróprio em embed | Médio | Moderação manual + reporte; nunca auto-embed desconhecido |

## 12. O Que Não Será Implementado Agora

- Nenhum player próprio, transcodificação ou armazenamento de vídeo;
- nenhum embed ativo em produção;
- nenhuma migration;
- nenhuma dependência externa nova.
