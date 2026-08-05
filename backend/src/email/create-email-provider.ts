import type { Env } from "../config/env.js";
import { ResendEmailProvider, SafeDevelopmentEmailProvider, type EmailProvider } from "./email-provider.js";

export function createEmailProvider(env: Env): EmailProvider {
  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
    return new ResendEmailProvider(env.RESEND_API_KEY, env.EMAIL_FROM);
  }
  return new SafeDevelopmentEmailProvider();
}
