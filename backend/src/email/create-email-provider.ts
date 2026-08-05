import type { Env } from "../config/env.js";
import { LocalDevelopmentEmailProvider, ResendEmailProvider, SafeDevelopmentEmailProvider, type EmailProvider } from "./email-provider.js";

export function createEmailProvider(env: Env): EmailProvider {
  if (env.NODE_ENV !== "production") return new LocalDevelopmentEmailProvider();
  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
    return new ResendEmailProvider(env.RESEND_API_KEY, env.EMAIL_FROM);
  }
  return new SafeDevelopmentEmailProvider();
}
