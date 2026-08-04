const SENSITIVE_QUERY_PARAMS =
  /([?&](?:code|state|token|access_token|refresh_token|authorization)=)[^&\s]+/gi;

/**
 * Remove valores sensíveis (código de autorização OAuth, tokens) de uma URL
 * antes de registrá-la em logs. Mantém o restante da query para diagnóstico.
 */
export function sanitizeLogUrl(url: string): string {
  return url.replace(SENSITIVE_QUERY_PARAMS, "$1[REDACTED]");
}