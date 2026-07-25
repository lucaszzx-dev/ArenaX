# Configuração do Login com Google

O ArenaX usa o fluxo OAuth 2.0 de aplicação web com código de autorização. O backend recebe o retorno do Google e cria a sessão segura do ArenaX.

## 1. Criar as credenciais

1. Acesse o [Google Auth Platform](https://console.cloud.google.com/auth/clients).
2. Crie ou selecione um projeto.
3. Configure a tela de consentimento.
4. Crie um cliente OAuth do tipo **Aplicativo da Web**.
5. Em **URIs de redirecionamento autorizados**, adicione exatamente:

   ```text
   http://localhost:3333/api/auth/google/callback
   ```

O protocolo, porta, caminho e barra final precisam ser idênticos. Caso contrário, o Google responderá com `redirect_uri_mismatch`.

## 2. Configurar o ambiente local

Copie o exemplo caso ainda não exista:

```powershell
Copy-Item backend/.env.example backend/.env
```

Preencha no `backend/.env`:

```env
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3333/api/auth/google/callback
```

O arquivo `.env` está ignorado pelo Git. Nunca publique o client secret.

## 3. Como o fluxo funciona

1. O frontend abre `GET /api/auth/google`.
2. O backend cria um valor `state` aleatório e o salva em cookie `HttpOnly`.
3. O usuário escolhe uma conta no Google.
4. O Google retorna um código para `/api/auth/google/callback`.
5. O backend confere o `state`, troca o código por um token e busca apenas nome, e-mail e avatar.
6. O ArenaX cria ou vincula a conta e emite sua própria sessão.
7. O usuário volta para `/painel`.

O `state` reduz o risco de falsificação de requisição. O ArenaX solicita apenas os escopos `openid`, `email` e `profile`.

Referências oficiais:

- [OAuth 2.0 para aplicações web](https://developers.google.com/identity/protocols/oauth2/web-server)
- [OpenID Connect do Google](https://developers.google.com/identity/openid-connect/openid-connect)
