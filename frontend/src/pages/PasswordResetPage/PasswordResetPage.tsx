import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { AuthCard } from "../../components/AuthCard/AuthCard";
import { confirmPasswordReset, requestPasswordReset, verifyPasswordReset } from "../../features/auth/auth-api";
import { ApiError } from "../../lib/api";
import styles from "../../components/AuthForm/AuthForm.module.css";

export function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"request" | "verify" | "password" | "done">("request");
  const [token, setToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null); setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      if (step === "request") {
        await requestPasswordReset(email);
        setStep("verify");
        setMessage("Se existir uma conta para este e-mail, enviamos um código.");
      } else if (step === "verify") {
        const result = await verifyPasswordReset(email, String(data.get("code") ?? ""));
        setToken(result.verificationToken); setStep("password");
      } else if (step === "password") {
        await confirmPasswordReset(email, token, String(data.get("password") ?? ""));
        setStep("done");
      }
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Não foi possível concluir. Tente novamente.");
    } finally { setPending(false); }
  }

  return <AuthCard title={step === "done" ? "Senha redefinida." : "Redefina sua senha."} description="Use um código temporário enviado para seu e-mail.">
    <form className={styles.form} onSubmit={submit}>
      {step === "request" && <label>E-mail<input autoComplete="email" name="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>}
      {step === "verify" && <label>Código<input autoComplete="one-time-code" inputMode="numeric" maxLength={6} name="code" pattern="[0-9]{6}" required /></label>}
      {step === "password" && <label>Nova senha<span className={styles.passwordField}><input autoComplete="new-password" minLength={8} name="password" required type={showPassword ? "text" : "password"} /><button aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className={styles.passwordToggle} onClick={() => setShowPassword((value) => !value)} type="button"><span aria-hidden="true">{showPassword ? "◉" : "◌"}</span></button></span></label>}
      {message && <p className={styles.error} role="alert">{message}</p>}
      {step !== "done" && <button disabled={pending} type="submit">{pending ? "Aguarde..." : step === "request" ? "Enviar código" : step === "verify" ? "Validar código" : "Redefinir senha"}</button>}
      <p><Link to="/entrar">Voltar para entrar</Link></p>
    </form>
  </AuthCard>;
}
