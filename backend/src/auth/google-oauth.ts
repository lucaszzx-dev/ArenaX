import { z } from "zod";

import { AppError } from "../errors/app-error.js";

const tokenResponseSchema = z.object({
  access_token: z.string().min(1)
});

const userInfoSchema = z.object({
  sub: z.string().min(1),
  email: z.email(),
  email_verified: z.literal(true),
  name: z.string().min(1),
  picture: z.url().optional()
});

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function createGoogleAuthorizationUrl(
  config: GoogleOAuthConfig,
  state: string
) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account"
  }).toString();

  return url.toString();
}

export async function getGoogleProfile(
  config: GoogleOAuthConfig,
  code: string
) {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code"
    })
  });

  if (!tokenResponse.ok) {
    throw new AppError(
      "Não foi possível validar o acesso com o Google.",
      401,
      "GOOGLE_TOKEN_EXCHANGE_FAILED"
    );
  }

  const token = tokenResponseSchema.parse(await tokenResponse.json());
  const userInfoResponse = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: {
        Authorization: `Bearer ${token.access_token}`
      }
    }
  );

  if (!userInfoResponse.ok) {
    throw new AppError(
      "Não foi possível obter seu perfil do Google.",
      401,
      "GOOGLE_PROFILE_FAILED"
    );
  }

  const profile = userInfoSchema.parse(await userInfoResponse.json());

  return {
    provider: "google" as const,
    providerAccountId: profile.sub,
    email: profile.email,
    displayName: profile.name,
    avatarUrl: profile.picture ?? null
  };
}
