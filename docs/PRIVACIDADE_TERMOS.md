# Política de privacidade e termos de uso

Última revisão: 2 de agosto de 2026.

Documento de referência básica para o ArenaX. Antes do lançamento público,
revise com apoio jurídico adequado à jurisdição de operação.

## Dados coletados

- Cadastro: nome de exibição, e-mail e senha (armazenada apenas como hash).
- Perfil: foto (URL), biografia e dados opcionais informados pelo usuário.
- Conteúdo criado pelo usuário: campeonatos, clubes, equipes, jogadores,
  partidas, súmulas e estatísticas.
- Sessão: token aleatório de 32 bytes armazenado em hash no servidor e em
  cookie `HttpOnly` no navegador.
- OAuth (Google): identificador e e-mail do provedor quando o usuário opta
  pelo login social.

## Uso dos dados

- Operar o serviço: autenticação, autorização e exibição pública de
  campeonatos publicados.
- Notificações internas: partidas próximas, alterações de horário,
  resultados, convocações e avanços no mata-mata.
- Diagnóstico: logs operacionais sem tokens, senhas ou conteúdo sensível.

## Compartilhamento

- O conteúdo de campeonatos publicados é visível publicamente.
- Dados não são vendidos a terceiros.
- Provedores de infraestrutura (banco, hospedagem) processam dados sob
  contratos de confidencialidade.

## Direitos do usuário

- Acessar e corrigir seus dados a qualquer momento.
- Solicitar a exclusão da conta e dos dados associados.
- Revogar sessões (sair) em qualquer dispositivo.

## Retenção

- Contas e dados são mantidos enquanto a conta existir.
- Sessões expiram conforme `SESSION_TTL_DAYS`.
- Logs são mantidos pelo período mínimo necessário para diagnóstico.

## Segurança

- Senhas armazenadas com hash seguro.
- Cookies de sessão `HttpOnly` e `Secure`.
- Rate limit em autenticação e rotas administrativas.
- Acesso a dados restrito por proprietário da arena.

## Termos de uso (resumo)

- O usuário é responsável pelo conteúdo que publica.
- É proibido publicar conteúdo ilegal, difamatório ou que viole direitos de
  terceiros.
- O serviço pode suspender contas que violem estes termos.
- O serviço é fornecido "como está", sem garantia de disponibilidade
  contínua.