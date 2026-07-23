import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { login, register } from "../../features/auth/auth-api";
import { ApiError } from "../../lib/api";
import styles from "./AuthForm.module.css";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {isRegister && (
        <label>
          Nome público
          <input
            autoComplete="name"
            name="displayName"
            placeholder="Como você aparecerá na arena"
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
        <input
          autoComplete={isRegister ? "new-password" : "current-password"}
          minLength={8}
          name="password"
          placeholder="Mínimo de 8 caracteres"
          required
          type="password"
        />
      </label>

      {errorMessage && (
        <p className={styles.error} role="alert">
          {errorMessage}
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
    </form>
  );
}
