export type PasswordResetEmail = {
  to: string;
  code: string;
};

/** Transport abstraction so delivery can be tested without leaking reset codes. */
export interface EmailProvider {
  sendPasswordReset(input: PasswordResetEmail): Promise<void>;
}

export class SafeDevelopmentEmailProvider implements EmailProvider {
  async sendPasswordReset(): Promise<void> {
    // Deliberately do not log the code: development should not normalize secret leakage.
  }
}

export class ResendEmailProvider implements EmailProvider {
  constructor(private readonly apiKey: string, private readonly from: string) {}

  async sendPasswordReset(input: PasswordResetEmail): Promise<void> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: this.from,
        to: [input.to],
        subject: "Codigo para redefinir sua senha ArenaX",
        text: `Use o codigo ${input.code} para redefinir sua senha. Ele expira em 10 minutos.`
      })
    });
    if (!response.ok) throw new Error("Falha ao enviar e-mail de redefinicao.");
  }
}
