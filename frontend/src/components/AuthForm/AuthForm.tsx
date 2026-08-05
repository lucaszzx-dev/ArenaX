import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { login, register, resendLoginVerification, verifyLoginVerification } from "../../features/auth/auth-api";
import { ApiError, getApiUrl } from "../../lib/api";
import styles from "./AuthForm.module.css";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<number>(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!challengeToken) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [challengeToken]);
  const mutation = useMutation({
    mutationFn: (input: {
      displayName?: string;
      email: string;
      password: string;
    }) => {
      if (isRegister) {
        return register({
          displayName: input.displayName ?? "",
          email: input.email,
          password: input.password
        });
      }

      return login({
        email: input.email,
        password: input.password
      });
    },
    onSuccess: async (data) => {
      if (!isRegister && "requiresVerification" in data) {
        setChallengeToken(data.challengeToken);
        setResendAvailableAt(Date.now() + 60_000);
        return;
      }
      queryClient.setQueryData(["current-user"], data);
      await navigate("/painel");
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Não foi possível conectar ao servidor."
      );
    }
  });
  const verifyMutation = useMutation({
    mutationFn: (code: string) => verifyLoginVerification(challengeToken!, code),
    onSuccess: async (data) => {
      queryClient.setQueryData(["current-user"], data);
      await navigate("/painel");
    },
    onError: (error) => setErrorMessage(error instanceof ApiError ? error.message : "NÃ£o foi possÃ­vel confirmar o cÃ³digo.")
  });
  const resendMutation = useMutation({
    mutationFn: () => resendLoginVerification(challengeToken!),
    onSuccess: () => { setResendAvailableAt(Date.now() + 60_000); setErrorMessage(null); },
    onError: (error) => setErrorMessage(error instanceof ApiError ? error.message : "NÃ£o foi possÃ­vel reenviar o cÃ³digo.")
  });
  const googleError = searchParams.get("erro") === "google_not_configured"
    ? "O login com Google ainda não foi configurado neste ambiente."
    : searchParams.has("erro")
      ? "Não foi possível entrar com o Google. Tente novamente."
      : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    if (isRegister) {
      mutation.mutate({
        displayName: String(formData.get("displayName") ?? ""),
        email,
        password
      });
      return;
    }

    mutation.mutate({ email, password });
  }

  function handleVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    verifyMutation.mutate(String(new FormData(event.currentTarget).get("code") ?? ""));
  }

  if (challengeToken) {
    const secondsRemaining = Math.max(0, Math.ceil((resendAvailableAt - now) / 1_000));
    return (
      <form className={styles.form} onSubmit={handleVerification}>
        <h2>Precisamos confirmar que Ã© vocÃª</h2>
        <p>Enviamos um cÃ³digo de seis dÃ­gitos para seu e-mail. Ele expira em cerca de 10 minutos.</p>
        <label>
          CÃ³digo de confirmaÃ§Ã£o
          <input aria-describedby="verification-help" autoComplete="one-time-code" inputMode="numeric" maxLength={6} name="code" pattern="[0-9]{6}" required />
        </label>
        <p id="verification-help">Digite o cÃ³digo recebido para concluir o login.</p>
        {errorMessage && <p className={styles.error} role="alert">{errorMessage}</p>}
        <button disabled={verifyMutation.isPending} type="submit">{verifyMutation.isPending ? "Confirmando..." : "Confirmar"}</button>
        <button disabled={resendMutation.isPending || secondsRemaining > 0} onClick={() => resendMutation.mutate()} type="button">
          {resendMutation.isPending ? "Reenviando..." : secondsRemaining > 0 ? `Reenviar cÃ³digo (${secondsRemaining}s)` : "Reenviar cÃ³digo"}
        </button>
        <button onClick={() => { setChallengeToken(null); setErrorMessage(null); }} type="button">Voltar ao login</button>
      </form>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <a className={styles.googleButton} href={getApiUrl("/auth/google")}>
        <span aria-hidden="true">G</span>
        Continuar com Google
      </a>

      <div className={styles.divider}>
        <span>ou use seu e-mail</span>
      </div>

      {isRegister && (
        <label>
          Nome público
          <input
            autoComplete="name"
            name="displayName"
            placeholder="Como você aparecerá na competição"
            required
          />
        </label>
      )}

      <label>
        E-mail
        <input
          autoComplete="email"
          name="email"
          placeholder="voce@exemplo.com"
          required
          type="email"
        />
      </label>

      <label>
        Senha
        <span className={styles.passwordField}>
          <input autoComplete={isRegister ? "new-password" : "current-password"} minLength={8} name="password" placeholder="Mínimo de 8 caracteres" required type={showPassword ? "text" : "password"} />
          <button aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className={styles.passwordToggle} onClick={() => setShowPassword((value) => !value)} type="button"><span aria-hidden="true">{showPassword ? "◉" : "◌"}</span></button>
        </span>
      </label>

      {(errorMessage || googleError) && (
        <p className={styles.error} role="alert">
          {errorMessage ?? googleError}
        </p>
      )}

      <button disabled={mutation.isPending} type="submit">
        {mutation.isPending
          ? "Aguarde..."
          : isRegister
            ? "Criar minha conta"
            : "Entrar na ArenaX"}
      </button>

      <p>
        {isRegister ? "Já possui uma conta?" : "Ainda não possui uma conta?"}{" "}
        <Link to={isRegister ? "/entrar" : "/cadastro"}>
          {isRegister ? "Entrar" : "Criar conta"}
        </Link>
      </p>
      {!isRegister && <p><Link to="/esqueci-minha-senha">Esqueci minha senha</Link></p>}
    </form>
  );
}
